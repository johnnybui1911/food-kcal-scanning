import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, space } from "@/lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost";
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, variant = "solid", disabled, loading }: Props) {
  const solid = variant === "solid";
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        solid ? styles.solid : styles.ghost,
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? colors.onAccent : colors.accent} />
      ) : (
        <Text style={[styles.label, { color: solid ? colors.onAccent : colors.accent }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius,
    paddingHorizontal: space(4),
    alignItems: "center",
    justifyContent: "center",
  },
  solid: { backgroundColor: colors.accent },
  ghost: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accent },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: "600" },
});
