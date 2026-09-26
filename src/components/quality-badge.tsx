import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { colors, radius, space } from "@/lib/theme";

function scoreColor(score: number) {
  if (score >= 70) return colors.accent;
  if (score >= 40) return colors.warn;
  return colors.error;
}

export function QualityBadge({ score, reasons }: { score: number; reasons: string[] }) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{t.qualityScore}</Text>
        <View style={[styles.pill, { backgroundColor: scoreColor(score) }]}>
          <Text style={styles.pillText}>{score}/100</Text>
        </View>
      </View>
      {reasons.map((r, i) => (
        <Text key={i} style={styles.reason}>
          • {r}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: space(4), gap: space(1.5) },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space(1) },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  pill: { borderRadius: 999, paddingHorizontal: space(3), paddingVertical: space(1) },
  pillText: { color: colors.onAccent, fontWeight: "800", fontSize: 14 },
  reason: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
