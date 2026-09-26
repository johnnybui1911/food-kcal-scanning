import { Pressable, StyleSheet, Text, View } from "react-native";
import { useToast } from "@/components/toast";
import { copyText } from "@/lib/clipboard";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors, space } from "@/lib/theme";

// Copies the number only (no unit) so it pastes cleanly into tracker app fields.
export function NutrientRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  const { t } = useI18n();
  const { show } = useToast();
  const text = formatNumber(value);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${text} ${unit}, ${t.copy}`}
      onPress={() => {
        copyText(text);
        show(`${t.copied}: ${text}`);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <Text style={styles.value}>
          {text} <Text style={styles.unit}>{unit}</Text>
        </Text>
        <Text style={styles.chip}>{t.copy}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space(4),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.accentSoft },
  label: { fontSize: 16, color: colors.ink },
  right: { flexDirection: "row", alignItems: "center", gap: space(3) },
  value: { fontSize: 17, fontWeight: "700", color: colors.ink, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 14, fontWeight: "400", color: colors.muted },
  chip: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: space(2),
    paddingVertical: 2,
    overflow: "hidden",
  },
});
