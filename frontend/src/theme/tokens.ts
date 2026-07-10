/**
 * IDEACON Theme - Futuristic Saffron/Green with light/dark modes.
 * Based on design_guidelines.json.
 */
import { Platform } from "react-native";

export type ThemeMode = "dark" | "light";

export const darkTheme = {
  mode: "dark" as ThemeMode,
  bg: "#050505",
  surface: "#121212",
  surfaceElev: "#1A1A1A",
  glass: "rgba(255,255,255,0.05)",
  primary: "#FF6B00", // Saffron
  primaryDim: "rgba(255,107,0,0.15)",
  secondary: "#00FF66", // Growth green
  secondaryDim: "rgba(0,255,102,0.15)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.62)",
  textFaint: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.1)",
  borderStrong: "rgba(255,255,255,0.22)",
  error: "#FF3333",
  success: "#00FF66",
  warning: "#FFB800",
  overlay: "rgba(0,0,0,0.72)",
};

export const lightTheme = {
  mode: "light" as ThemeMode,
  bg: "#F9F9F9",
  surface: "#FFFFFF",
  surfaceElev: "#FFFFFF",
  glass: "rgba(0,0,0,0.03)",
  primary: "#E05A00",
  primaryDim: "rgba(224,90,0,0.12)",
  secondary: "#0A8F3C",
  secondaryDim: "rgba(10,143,60,0.12)",
  text: "#0A0A0A",
  textMuted: "rgba(0,0,0,0.6)",
  textFaint: "rgba(0,0,0,0.35)",
  border: "rgba(0,0,0,0.1)",
  borderStrong: "rgba(0,0,0,0.22)",
  error: "#CC0000",
  success: "#0A8F3C",
  warning: "#B08000",
  overlay: "rgba(0,0,0,0.35)",
};

export type Theme = typeof darkTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 34, fontWeight: "900" as const, letterSpacing: -1.2, lineHeight: 38 },
  h2: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.6, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: "500" as const, letterSpacing: 2, textTransform: "uppercase" as const },
  mono: { fontSize: 13, fontFamily: Platform.OS === "ios" ? ("Courier" as const) : ("monospace" as const), letterSpacing: 0.5 },
};
