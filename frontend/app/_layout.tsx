import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";
import { AuthProvider } from "@/src/context/AuthContext";

if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    // Initialize Mobile Ads SDK dynamically on native platforms only
    if (Platform.OS !== "web") {
      try {
        const mobileAds = require("react-native-google-mobile-ads").default;
        mobileAds()
          .initialize()
          .then((adapterStatuses: any) => {
            console.log("AdMob initialized successfully:", adapterStatuses);
          })
          .catch((err: any) => {
            console.error("AdMob initialization failed:", err);
          });
      } catch (e) {
        console.warn("Failed to initialize mobile ads", e);
      }
    }

    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
