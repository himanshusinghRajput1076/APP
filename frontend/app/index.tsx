import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  withRepeat,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme/ThemeProvider";
import { storage } from "@/src/utils/storage";
import { ONBOARDING_KEY } from "@/app/onboarding";
import { api } from "@/src/api/client";

const { width } = Dimensions.get("window");

export default function Splash() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<any>(null);

  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const letterY = useSharedValue(30);
  const dotOpacity = useSharedValue(0);

  useEffect(() => {
    api.get("/settings/public").then(r => setSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.exp) });
    letterY.value = withDelay(300, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    dotOpacity.value = withDelay(800, withRepeat(withTiming(1, { duration: 600 }), -1, true));
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [scale, opacity, glow, letterY, dotOpacity]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(async () => {
      if (user) {
        if (user.role === "admin") router.replace("/admin");
        else router.replace("/(tabs)/home");
      } else {
        const seen = await storage.getItem<string>(ONBOARDING_KEY, "");
        if (seen === "1") router.replace("/(auth)/welcome");
        else router.replace("/onboarding");
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const letterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: letterY.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5,
    transform: [{ scale: 1 + glow.value * 0.15 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]} testID="splash-screen">
      {/* Radial glow */}
      <Animated.View style={[styles.glowWrap, glowStyle]} pointerEvents="none">
        <LinearGradient
          colors={[`${theme.primary}66`, "transparent"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Logo mark */}
      <Animated.View style={[logoStyle, { alignItems: "center" }]}>
        {settings?.company_logo ? (
          <Image source={{ uri: settings.company_logo }} style={{ width: 84, height: 84, borderRadius: 12 }} resizeMode="contain" />
        ) : (
          <View style={[styles.logoBox, { borderColor: theme.primary }]}>
            <View style={[styles.logoInner, { backgroundColor: theme.primary }]}>
              <Text style={styles.logoLetter}>I</Text>
            </View>
            <View style={[styles.logoBar, { backgroundColor: theme.secondary }]} />
          </View>
        )}
      </Animated.View>

      {/* Wordmark */}
      <Animated.View style={[letterStyle, { marginTop: 24, alignItems: "center" }]}>
        <Text style={[styles.title, { color: theme.text }]}>{settings?.company_name || "IDEACON-ORIGENIX"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <View style={[styles.tickBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.tagline, { color: theme.textMuted }]}>THE STARTUP ECOSYSTEM</Text>
          <View style={[styles.tickBar, { backgroundColor: theme.secondary }]} />
        </View>
      </Animated.View>

      <Animated.View style={[{ position: "absolute", bottom: 60, flexDirection: "row", gap: 6 }, dotStyle]}>
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
        <View style={[styles.dot, { backgroundColor: theme.text, opacity: 0.5 }]} />
        <View style={[styles.dot, { backgroundColor: theme.secondary }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  glowWrap: { position: "absolute", width: width * 1.5, height: width * 1.5, alignItems: "center", justifyContent: "center" },
  glow: { width: "100%", height: "100%", borderRadius: 999 },
  logoBox: {
    width: 84, height: 84,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  logoInner: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  logoLetter: { color: "#050505", fontSize: 34, fontWeight: "900" },
  logoBar: { position: "absolute", bottom: -6, left: -6, width: 24, height: 8 },
  title: { fontSize: 42, fontWeight: "900", letterSpacing: 6 },
  tagline: { fontSize: 10, letterSpacing: 4, fontWeight: "600", marginHorizontal: 12 },
  tickBar: { width: 24, height: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
