import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { IMAGE_JPEG_QUALITY, IMAGE_MAX_SIDE, THUMB_SIDE } from "./config";

export type PreparedImage = { base64: string; mediaType: "image/jpeg"; thumbnail: string };

// Web rule: browsers only open the picker inside a user gesture, so call this as the first
// await in onPress. Browsers may never resolve on cancel, so set no "busy" state before it.
export async function pickImage(source: "camera" | "library"): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS !== "web") {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("permission_denied");
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0];
}

function fitSize(width: number, height: number, maxSide: number): { width: number } | { height: number } {
  if (!width || !height) return { width: maxSide };
  return width >= height ? { width: Math.min(maxSide, width) } : { height: Math.min(maxSide, height) };
}

function stripPrefix(b64: string | undefined): string {
  if (!b64) throw new Error("image_encode_failed");
  return b64.replace(/^data:[^;]+;base64,/, "");
}

// Decode the full-resolution photo once, then derive the thumbnail from the 1024px image:
// on web the resize runs on the main thread, and a 24MP iPhone photo decoded twice in
// parallel can crash the Safari tab.
export async function prepareImage(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  ctx.resize(fitSize(asset.width, asset.height, IMAGE_MAX_SIDE));
  const img = await ctx.renderAsync();
  const full = await img.saveAsync({ format: SaveFormat.JPEG, compress: IMAGE_JPEG_QUALITY, base64: true });

  const thumbCtx = ImageManipulator.manipulate(img);
  thumbCtx.resize(fitSize(img.width, img.height, THUMB_SIDE));
  const thumbImg = await thumbCtx.renderAsync();
  const thumb = await thumbImg.saveAsync({ format: SaveFormat.JPEG, compress: 0.5, base64: true });

  return {
    base64: stripPrefix(full.base64),
    mediaType: "image/jpeg",
    thumbnail: `data:image/jpeg;base64,${stripPrefix(thumb.base64)}`,
  };
}
