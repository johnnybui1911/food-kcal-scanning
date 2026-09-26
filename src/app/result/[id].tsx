import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FeedbackPanel } from "@/components/feedback-panel";
import { LanguageToggle } from "@/components/language-toggle";
import { NutrientRow } from "@/components/nutrient-row";
import { PrimaryButton } from "@/components/primary-button";
import { QualityBadge } from "@/components/quality-badge";
import { Screen } from "@/components/screen";
import { useToast } from "@/components/toast";
import { refineResult, type ApiErrorKind } from "@/lib/api-client";
import { copyText } from "@/lib/clipboard";
import { CORRECTION_MAX, PORTION_OPTIONS } from "@/lib/config";
import { buildCopyAllText, formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { scaleResult } from "@/lib/portion";
import { getHistoryItem, saveHistoryItem, type HistoryItem } from "@/lib/storage";
import { colors, radius, space } from "@/lib/theme";

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { show } = useToast();
  const [item, setItem] = useState<HistoryItem | null | undefined>(undefined);
  const [correction, setCorrection] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<ApiErrorKind | null>(null);

  useEffect(() => {
    getHistoryItem(String(id)).then(setItem);
  }, [id]);

  const header = (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
        <Text style={styles.backText}>← {t.back}</Text>
      </Pressable>
      <LanguageToggle />
    </View>
  );

  if (item === undefined) return null;
  if (item === null) {
    return (
      <Screen header={header}>
        <Text style={styles.muted}>{t.errors.notFound}</Text>
        <PrimaryButton label={t.scanNow} onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  const shown = scaleResult(item.result, item.multiplier);
  const labels = {
    calories: t.calories,
    protein: t.protein,
    carbs: t.carbs,
    fat: t.fat,
    fiber: t.fiber,
    sugar: t.sugar,
    sodium: t.sodium,
  };

  const update = (next: HistoryItem) => {
    setItem(next);
    saveHistoryItem(next);
  };

  const refine = async () => {
    const text = correction.trim();
    if (!text || refining) return;
    setRefining(true);
    setRefineError(null);
    const res = await refineResult({ previous: item.result, correction: text, locale });
    setRefining(false);
    if (!res.ok) {
      setRefineError(res.kind);
      return;
    }
    update({
      ...item,
      result: res.data.result,
      model: res.data.model,
      promptVersion: res.data.prompt_version,
      multiplier: 1,
      feedback: undefined,
    });
    setCorrection("");
    show(t.updated);
  };

  const kcalText = formatNumber(shown.calories_kcal);

  return (
    <Screen header={header}>
      {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={styles.photo} resizeMode="cover" /> : null}

      <View style={{ gap: space(1) }}>
        <Text accessibilityRole="header" style={styles.dish}>
          {shown.dish_name}
        </Text>
        <Text style={styles.muted}>{shown.serving_description}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${kcalText} kcal, ${t.copy}`}
        onPress={() => {
          copyText(kcalText);
          show(`${t.copied}: ${kcalText}`);
        }}
        style={styles.kcalCard}
      >
        <Text style={styles.kcal}>
          {kcalText} <Text style={styles.kcalUnit}>kcal</Text>
        </Text>
        <Text style={styles.muted}>
          {t.range} {formatNumber(shown.calories_min_kcal)}–{formatNumber(shown.calories_max_kcal)} kcal ·{" "}
          {t.confidence[shown.confidence]}
        </Text>
        <Text style={styles.disclaimer}>{t.estimateDisclaimer}</Text>
      </Pressable>

      <View style={{ gap: space(2) }}>
        <Text style={styles.section}>{t.portion}</Text>
        <View style={styles.portions} accessibilityRole="radiogroup">
          {PORTION_OPTIONS.map((m) => {
            const active = item.multiplier === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => update({ ...item, multiplier: m })}
                style={[styles.portion, active && styles.portionOn]}
              >
                <Text style={[styles.portionText, active && styles.portionTextOn]}>×{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.table}>
        <NutrientRow label={t.protein} value={shown.protein_g} unit="g" />
        <NutrientRow label={t.carbs} value={shown.carbs_g} unit="g" />
        <NutrientRow label={t.fat} value={shown.fat_g} unit="g" />
        <NutrientRow label={t.fiber} value={shown.fiber_g} unit="g" />
        <NutrientRow label={t.sugar} value={shown.sugar_g} unit="g" />
        <NutrientRow label={t.sodium} value={shown.sodium_mg} unit="mg" />
      </View>

      <PrimaryButton
        label={t.copyAll}
        onPress={() => {
          copyText(buildCopyAllText(shown, labels));
          show(t.copied);
        }}
      />

      <QualityBadge score={shown.quality_score} reasons={shown.quality_reasons} />

      {shown.ingredients.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>{t.ingredients}</Text>
          {shown.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingRow}>
              <Text style={styles.ingName}>{ing.name}</Text>
              <Text style={styles.muted}>
                {formatNumber(ing.weight_g)} g · {formatNumber(ing.calories_kcal)} kcal
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.section}>{t.fixResult}</Text>
        <TextInput
          value={correction}
          onChangeText={setCorrection}
          maxLength={CORRECTION_MAX}
          placeholder={t.fixPlaceholder}
          placeholderTextColor={colors.muted}
          editable={!refining}
          style={styles.input}
          accessibilityLabel={t.fixResult}
          onSubmitEditing={refine}
        />
        {refineError ? (
          <Text style={styles.error} role="alert">
            {t.errors[refineError === "bad_request" ? "generic" : refineError]}
          </Text>
        ) : null}
        <PrimaryButton label={t.send} onPress={refine} loading={refining} disabled={!correction.trim()} />
      </View>

      <FeedbackPanel key={item.result.calories_kcal + item.model} item={item} onSaved={setItem} />

      {shown.notes ? (
        <Text style={styles.notes}>
          {t.notes}: {shown.notes}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.accent, fontWeight: "700", fontSize: 16 },
  photo: { width: "100%", height: 180, borderRadius: radius * 1.5, backgroundColor: colors.line },
  dish: { fontSize: 24, fontWeight: "800", color: colors.ink },
  muted: { color: colors.muted, fontSize: 14 },
  kcalCard: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: space(4), gap: space(1) },
  kcal: { fontSize: 40, fontWeight: "800", color: colors.ink, fontVariant: ["tabular-nums"] },
  kcalUnit: { fontSize: 20, fontWeight: "600", color: colors.muted },
  disclaimer: { color: colors.muted, fontSize: 12, fontStyle: "italic", marginTop: space(1) },
  section: { fontSize: 16, fontWeight: "700", color: colors.ink },
  portions: { flexDirection: "row", gap: space(2) },
  portion: { flex: 1, minHeight: 44, borderRadius: radius, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  portionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  portionText: { fontWeight: "700", color: colors.ink },
  portionTextOn: { color: colors.onAccent },
  table: { borderRadius: radius, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  card: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: space(4), gap: space(3) },
  ingRow: { flexDirection: "row", justifyContent: "space-between", gap: space(3) },
  ingName: { color: colors.ink, fontSize: 15, flexShrink: 1 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius, paddingHorizontal: space(3), color: colors.ink, fontSize: 16 },
  error: { color: colors.error, fontWeight: "600" },
  notes: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
