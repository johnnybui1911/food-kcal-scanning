import type { ImagePickerAsset } from "expo-image-picker";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from "react-native";
import { A2hsBanner } from "@/components/a2hs-banner";
import { LanguageToggle } from "@/components/language-toggle";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { scanFood, type ApiErrorKind } from "@/lib/api-client";
import { APP_NAME, NOTE_MAX } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { pickImage, prepareImage, type PreparedImage } from "@/lib/image";
import { getOnboarded, saveHistoryItem } from "@/lib/storage";
import { colors, radius, space } from "@/lib/theme";

type Status = "idle" | "preparing" | "analyzing" | "error";
type ErrorKey = ApiErrorKind | "permission";

export default function ScanScreen() {
  const { t, locale } = useI18n();
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ErrorKey | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getOnboarded().then((done) => (done ? setReady(true) : router.replace("/onboarding")));
  }, []);

  const analyze = async (img: PreparedImage) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("analyzing");
    setError(null);
    try {
      const res = await scanFood(
        { image_base64: img.base64, media_type: img.mediaType, note: note.trim(), locale },
        controller.signal,
      );
      if (!res.ok) {
        setStatus("error");
        setError(res.kind);
        return;
      }
      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        createdAt: Date.now(),
        note: note.trim(),
        thumbnail: img.thumbnail,
        result: res.data.result,
        model: res.data.model,
        promptVersion: res.data.prompt_version,
        multiplier: 1,
      };
      await saveHistoryItem(item);
      setStatus("idle");
      setImage(null);
      setNote("");
      router.push({ pathname: "/result/[id]", params: { id: item.id } });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setError("generic");
    }
  };

  const onPick = async (source: "camera" | "library") => {
    // pickImage must be the first await: browsers only open the picker inside the tap gesture.
    let asset: ImagePickerAsset | null;
    try {
      asset = await pickImage(source);
    } catch {
      setStatus("error");
      setError("permission");
      return;
    }
    if (!asset) return;
    setStatus("preparing");
    setError(null);
    try {
      const prepared = await prepareImage(asset);
      setImage(prepared);
      await analyze(prepared);
    } catch {
      setStatus("error");
      setError("generic");
    }
  };

  if (!ready) return null;

  const busy = status === "preparing" || status === "analyzing";

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.brand}>
            {APP_NAME}
          </Text>
          <View style={styles.headerRight}>
            <Link href="/history" style={styles.link}>
              {t.history}
            </Link>
            <LanguageToggle />
          </View>
        </View>
      }
    >
      <A2hsBanner />

      <View style={styles.preview}>
        {image ? (
          <Image source={{ uri: image.thumbnail }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <Text style={styles.placeholder}>🍜</Text>
        )}
        {busy ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.onAccent} />
            <Text style={styles.overlayText}>{t.analyzing}</Text>
          </View>
        ) : null}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={NOTE_MAX}
        placeholder={t.notePlaceholder}
        placeholderTextColor={colors.muted}
        editable={!busy}
        style={styles.input}
        accessibilityLabel={t.notePlaceholder}
      />

      {status === "error" && error ? (
        <View style={styles.errorBox} role="alert">
          <Text style={styles.errorText}>{t.errors[error === "bad_request" ? "generic" : error]}</Text>
          {image && error !== "rate_limited" && error !== "permission" ? (
            <PrimaryButton variant="ghost" label={t.retry} onPress={() => analyze(image)} />
          ) : null}
        </View>
      ) : null}

      {busy ? (
        <PrimaryButton
          variant="ghost"
          label={t.cancel}
          onPress={() => abortRef.current?.abort()}
          disabled={status !== "analyzing"}
        />
      ) : (
        <View style={styles.actions}>
          <PrimaryButton label={`📷  ${t.takePhoto}`} onPress={() => onPick("camera")} />
          <PrimaryButton variant="ghost" label={`🖼  ${t.pickPhoto}`} onPress={() => onPick("library")} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 24, fontWeight: "800", color: colors.accent },
  headerRight: { flexDirection: "row", alignItems: "center", gap: space(3) },
  link: { color: colors.accent, fontWeight: "700", fontSize: 15, paddingVertical: space(2) },
  preview: {
    height: 260,
    borderRadius: radius * 1.5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  placeholder: { fontSize: 64 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(29,27,24,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: space(3),
  },
  overlayText: { color: colors.onAccent, fontWeight: "600", fontSize: 15 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius,
    paddingHorizontal: space(3),
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
  },
  errorBox: { backgroundColor: colors.errorSoft, borderRadius: radius, padding: space(3), gap: space(3) },
  errorText: { color: colors.error, fontSize: 15, fontWeight: "600" },
  actions: { gap: space(3) },
});
