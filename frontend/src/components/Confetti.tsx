/**
 * Confetti wrapper — safe on all platforms with reduced-motion fallback.
 */
import React from "react";
import ConfettiCannon from "react-native-confetti-cannon";
import { Dimensions } from "react-native";
import { useTheme } from "@/src/theme/ThemeProvider";

const { width } = Dimensions.get("window");

export function Confetti({ show, onDone }: { show: boolean; onDone?: () => void }) {
  const { theme } = useTheme();
  if (!show) return null;
  return (
    <ConfettiCannon
      count={140}
      origin={{ x: width / 2, y: -20 }}
      fadeOut
      explosionSpeed={340}
      fallSpeed={2600}
      colors={[theme.primary, theme.secondary, "#FFD700", "#FFFFFF", "#FF3366"]}
      onAnimationEnd={onDone}
    />
  );
}
