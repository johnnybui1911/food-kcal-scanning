import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { getA2hsDismissed, setA2hsDismissed } from "@/lib/storage";
import { colors, radius, space } from "@/lib/theme";

function isIosSafariBrowser(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export function A2hsBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafariBrowser()) return;
    getA2hsDismissed().then((d) => setVisible(!d));
  }, []);

  if (!visible) return null;
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t.a2hsTitle}</Text>
        <Text style={styles.body}>{t.a2hsBody}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setVisible(false);
          setA2hsDismissed();
        }}
        style={styles.close}
      >
        <Text style={styles.closeText}>{t.dismiss}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: space(3),
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius,
    padding: space(3),
  },
  title: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  body: { color: colors.muted, fontSize: 13, marginTop: 2 },
  close: { minHeight: 44, justifyContent: "center", paddingHorizontal: space(2) },
  closeText: { color: colors.accent, fontWeight: "700" },
});
