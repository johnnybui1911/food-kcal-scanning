import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// iOS Safari only allows clipboard writes that start synchronously inside the tap handler.
// Call copyText as the first statement of onPress and never await anything before it.
export function copyText(text: string): Promise<boolean> {
  const p = Clipboard.setStringAsync(text);
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  return p.then(() => true).catch(() => false);
}
