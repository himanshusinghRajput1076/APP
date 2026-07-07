import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { storage } from "@/src/utils/storage";
import { darkTheme, lightTheme, Theme, ThemeMode } from "@/src/theme/tokens";

type ThemeCtx = {
  theme: Theme;
  mode: ThemeMode;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

const KEY = "ideacon.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(KEY, "");
      if (saved === "dark" || saved === "light") {
        setModeState(saved);
      } else {
        setModeState(system === "light" ? "light" : "dark");
      }
    })();
  }, [system]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    storage.setItem(KEY, m);
  };
  const toggle = () => setMode(mode === "dark" ? "light" : "dark");

  const theme = mode === "dark" ? darkTheme : lightTheme;
  return (
    <ThemeContext.Provider value={{ theme, mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};
