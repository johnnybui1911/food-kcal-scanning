import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n, type Locale } from "@/lib/i18n";
import { colors, space } from "@/lib/theme";

const OPTIONS: Locale[] = ["vi", "en"];

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {OPTIONS.map((l) => {
        const active = l === locale;
        return (
          <Pressable
            key={l}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => setLocale(l)}
            style={[styles.seg, active && styles.active]}
          >
            <Text style={[styles.text, active && styles.activeText]}>{l.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: 999, overflow: "hidden" },
  seg: { minHeight: 36, minWidth: 44, paddingHorizontal: space(3), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  active: { backgroundColor: colors.accent },
  text: { fontSize: 13, fontWeight: "700", color: colors.muted },
  activeText: { color: colors.onAccent },
});
