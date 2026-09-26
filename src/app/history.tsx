import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LanguageToggle } from "@/components/language-toggle";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { useToast } from "@/components/toast";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { scaleResult } from "@/lib/portion";
import { deleteHistoryItem, listHistory, type HistoryItem } from "@/lib/storage";
import { colors, radius, space } from "@/lib/theme";

export default function HistoryScreen() {
  const { t, locale } = useI18n();
  const { show } = useToast();
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  const load = useCallback(() => {
    listHistory().then(setItems);
  }, []);

  useFocusEffect(load);

  const remove = async (id: string) => {
    await deleteHistoryItem(id);
    show(t.deleted);
    load();
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={styles.back}
          >
            <Text style={styles.backText}>← {t.back}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {t.history}
          </Text>
          <LanguageToggle />
        </View>
      }
    >
      {items && items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>{t.historyEmpty}</Text>
          <PrimaryButton label={t.scanNow} onPress={() => router.replace("/")} />
        </View>
      ) : null}

      {items?.map((item) => {
        const kcal = scaleResult(item.result, item.multiplier).calories_kcal;
        return (
          <View key={item.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/result/[id]", params: { id: item.id } })}
              style={styles.open}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.dish} numberOfLines={1}>
                  {item.result.dish_name}
                </Text>
                <Text style={styles.muted}>
                  {new Date(item.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                </Text>
              </View>
              <Text style={styles.kcal}>{formatNumber(kcal)} kcal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t.delete} ${item.result.dish_name}`}
              onPress={() => remove(item.id)}
              style={styles.delete}
            >
              <Text style={styles.deleteText}>🗑</Text>
            </Pressable>
          </View>
        );
      })}

      <Text style={styles.footer}>{t.historyLocalNote}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.accent, fontWeight: "700", fontSize: 16 },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  empty: { gap: space(4), alignItems: "stretch", paddingVertical: space(8) },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: space(3), padding: space(3), minHeight: 64 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.line },
  dish: { fontSize: 15, fontWeight: "700", color: colors.ink },
  kcal: { fontSize: 15, fontWeight: "700", color: colors.accent },
  delete: { width: 52, minHeight: 64, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: colors.line },
  deleteText: { fontSize: 18 },
  muted: { color: colors.muted, fontSize: 13 },
  footer: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: space(2) },
});
