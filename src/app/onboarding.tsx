import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LanguageToggle } from "@/components/language-toggle";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { useI18n } from "@/lib/i18n";
import { setOnboarded } from "@/lib/storage";
import { colors, radius, space } from "@/lib/theme";

export default function Onboarding() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const slides = t.onboarding;
  const slide = slides[step];
  const last = step === slides.length - 1;

  const finish = async () => {
    await setOnboarded();
    router.replace("/");
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <LanguageToggle />
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.illo}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {slide.title}
        </Text>
        <Text style={styles.text}>{slide.body}</Text>
        <View style={styles.dots} accessibilityLabel={`${step + 1} / ${slides.length}`}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        {last ? (
          <PrimaryButton label={t.getStarted} onPress={finish} />
        ) : (
          <PrimaryButton label={t.next} onPress={() => setStep(step + 1)} />
        )}
        <View style={styles.row}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton variant="ghost" label={t.back} onPress={() => setStep(step - 1)} />
            </View>
          ) : null}
          {!last ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton variant="ghost" label={t.skip} onPress={finish} />
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "flex-end" },
  body: { flex: 1, justifyContent: "center", gap: space(3) },
  illo: {
    height: 200,
    borderRadius: radius * 1.5,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 72 },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink, marginTop: space(3) },
  text: { fontSize: 16, lineHeight: 24, color: colors.muted },
  dots: { flexDirection: "row", gap: space(1.5), marginTop: space(2) },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { width: 24, backgroundColor: colors.accent },
  actions: { gap: space(3) },
  row: { flexDirection: "row", gap: space(3) },
});
