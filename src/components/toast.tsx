import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "@/lib/theme";

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), 1600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={styles.wrap}>
        {message ? (
          <View role="status" accessibilityLiveRegion="polite" style={styles.toast}>
            <Text style={styles.text}>{message}</Text>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return { show: useContext(ToastContext) };
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: space(8), alignItems: "center" },
  toast: {
    backgroundColor: colors.ink,
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
    borderRadius: 999,
    maxWidth: 360,
  },
  text: { color: colors.onAccent, fontSize: 14, fontWeight: "600" },
});
