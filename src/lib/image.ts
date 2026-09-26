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

function fitSize(asset: ImagePicker.ImagePickerAsset, maxSide: number): { width: number } | { height: number } {
  if (!asset.width || !asset.height) return { width: maxSide };
  return asset.width >= asset.height
    ? { width: Math.min(maxSide, asset.width) }
    : { height: Math.min(maxSide, asset.height) };
}

async function renderJpeg(asset: ImagePicker.ImagePickerAsset, maxSide: number, compress: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  ctx.resize(fitSize(asset, maxSide));
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
  if (!out.base64) throw new Error("image_encode_failed");
  return out.base64.replace(/^data:[^;]+;base64,/, "");
}

export async function prepareImage(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  const [base64, thumb] = await Promise.all([
    renderJpeg(asset, IMAGE_MAX_SIDE, IMAGE_JPEG_QUALITY),
    renderJpeg(asset, THUMB_SIDE, 0.5),
  ]);
  return { base64, mediaType: "image/jpeg", thumbnail: `data:image/jpeg;base64,${thumb}` };
}
