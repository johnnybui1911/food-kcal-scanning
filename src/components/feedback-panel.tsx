import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { sendFeedback } from "@/lib/api-client";
import { COMMENT_MAX, FEEDBACK_REASONS, type FeedbackReason } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { saveHistoryItem, type HistoryItem } from "@/lib/storage";
import { colors, radius, space } from "@/lib/theme";

export function FeedbackPanel({ item, onSaved }: { item: HistoryItem; onSaved: (next: HistoryItem) => void }) {
  const { t, locale } = useI18n();
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  if (item.feedback) {
    return (
      <View style={styles.card}>
        <Text style={styles.thanks}>{t.thanks}</Text>
      </View>
    );
  }

  const toggle = (r: FeedbackReason) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const submit = async () => {
    if (!rating || sending) return;
    setSending(true);
    const feedback = { rating, reasons, comment: comment.trim() };
    // Fire and forget: a failed send never blocks the user.
    sendFeedback({
      ...feedback,
      dish_name: item.result.dish_name,
      calories_kcal: item.result.calories_kcal,
      quality_score: item.result.quality_score,
      model: item.model,
      prompt_version: item.promptVersion,
      locale,
    }).catch(() => {});
    const next = { ...item, feedback };
    await saveHistoryItem(next);
    onSaved(next);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t.feedbackTitle}</Text>
      <View style={styles.thumbs}>
        {(["up", "down"] as const).map((r) => (
          <Pressable
            key={r}
            accessibilityRole="button"
            accessibilityLabel={r === "up" ? "👍" : "👎"}
            accessibilityState={{ selected: rating === r }}
            onPress={() => setRating(r)}
            style={[styles.thumb, rating === r && styles.thumbActive]}
          >
            <Text style={styles.thumbText}>{r === "up" ? "👍" : "👎"}</Text>
          </Pressable>
        ))}
      </View>
      {rating ? (
        <>
          <View style={styles.chips}>
            {FEEDBACK_REASONS.map((r) => {
              const on = reasons.includes(r);
              return (
                <Pressable
                  key={r}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(r)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.reasons[r]}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            maxLength={COMMENT_MAX}
            placeholder={t.comment}
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
            accessibilityLabel={t.comment}
          />
          <PrimaryButton label={t.send} onPress={submit} loading={sending} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: space(4), gap: space(3) },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  thanks: { fontSize: 15, color: colors.accent, fontWeight: "600", textAlign: "center" },
  thumbs: { flexDirection: "row", gap: space(3) },
  thumb: { flex: 1, minHeight: 48, borderRadius: radius, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  thumbActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  thumbText: { fontSize: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space(3), justifyContent: "center" },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.onAccent, fontWeight: "600" },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius,
    padding: space(3),
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: "top",
  },
});
