/**
 * Welcome / Sign-in landing screen with hero imagery.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Btn } from "@/src/components/ui";
import { spacing, typography } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const HERO = "https://images.unsplash.com/photo-1526289034009-0240ddb68ce3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmdXR1cmlzdGljJTIwYWJzdHJhY3QlMjBkYXJrJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc4MzQzMDQyM3ww&ixlib=rb-4.1.0&q=85";

export default function Welcome() {
  const router = useRouter();
  const { theme, toggle, mode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* HERO Image with parallax-style gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: HERO }} style={{ width: "100%", height: height * 0.7, opacity: 0.7 }} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", `${theme.bg}CC`, theme.bg]}
          style={{ position: "absolute", left: 0, right: 0, top: height * 0.28, bottom: 0 }}
        />
        {/* Corner accent lines */}
        <View style={{ position: "absolute", top: 0, left: 0, width: 60, height: 3, backgroundColor: theme.primary }} />
        <View style={{ position: "absolute", top: 0, right: 0, width: 3, height: 60, backgroundColor: theme.secondary }} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 28, height: 28, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#050505", fontWeight: "900" }}>I</Text>
            </View>
            <Text style={{ color: theme.text, fontWeight: "900", letterSpacing: 3 }}>IDEACON</Text>
          </View>
          <TouchableOpacity onPress={toggle} testID="theme-toggle-btn" style={{ width: 38, height: 38, borderWidth: 1, borderColor: theme.border, backgroundColor: `${theme.bg}88`, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1, justifyContent: "flex-end" }}>
          {/* Trust chips */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            <TrustChip color={theme.primary} label="DPIIT VISION" />
            <TrustChip color={theme.secondary} label="24H FREE" />
            <TrustChip color={theme.primary} label="₹100 REFERRAL" />
          </View>

          <Text style={{ ...typography.caption, color: theme.primary, marginBottom: 8 }}>THE STARTUP ECOSYSTEM · MADE IN INDIA</Text>
          <Text style={{ ...typography.h1, color: theme.text, fontSize: 42, lineHeight: 46 }}>Where India{"'"}s{"\n"}next unicorn{"\n"}starts.</Text>
          <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 16 }}>
            Connect Future Founders, Future Partners, and Growing Startups on one futuristic platform.
          </Text>

          {/* Stat row */}
          <View style={{ flexDirection: "row", marginTop: 24, gap: 10 }}>
            <MetricPill value="42+" label="SECTORS" />
            <MetricPill value="4" label="PANELS" />
            <MetricPill value="24h" label="TRIAL" />
          </View>

          <View style={{ marginTop: 32, gap: 12 }}>
            <Btn testID="get-started-btn" title="Get Started" onPress={() => router.push("/(auth)/role")} />
            <Btn testID="login-btn" title="I already have an account" variant="outline" onPress={() => router.push("/(auth)/login")} />
          </View>

          <View style={{ marginTop: 24, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 20, height: 2, backgroundColor: theme.primary }} />
            <Text style={{ color: theme.textFaint, fontSize: 10, letterSpacing: 3, fontWeight: "600" }}>BUILT ON DPIIT VISION</Text>
            <View style={{ width: 20, height: 2, backgroundColor: theme.secondary }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TrustChip({ color, label }: { color: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 5,
      borderWidth: 1, borderColor: color, backgroundColor: `${color}22`,
    }}>
      <Text style={{ color, fontSize: 9, letterSpacing: 2, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function MetricPill({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1,
      padding: 12,
      backgroundColor: `${theme.bg}CC`,
      borderWidth: 1, borderColor: theme.border,
    }}>
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 9, letterSpacing: 1.5, fontWeight: "600", marginTop: 2 }}>{label}</Text>
    </View>
  );
}
