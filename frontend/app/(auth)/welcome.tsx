/**
 * Welcome / Role picker.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Btn } from "@/src/components/ui";
import { spacing, typography } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

const IMG = "https://images.unsplash.com/photo-1526289034009-0240ddb68ce3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmdXR1cmlzdGljJTIwYWJzdHJhY3QlMjBkYXJrJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc4MzQzMDQyM3ww&ixlib=rb-4.1.0&q=85";

export default function Welcome() {
  const router = useRouter();
  const { theme, toggle, mode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: IMG }} style={{ width: "100%", height: "60%", opacity: 0.55 }} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", theme.bg, theme.bg]}
          style={{ position: "absolute", left: 0, right: 0, top: "30%", bottom: 0 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 28, height: 28, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#050505", fontWeight: "900" }}>I</Text>
            </View>
            <Text style={{ color: theme.text, fontWeight: "900", letterSpacing: 3 }}>IDEACON</Text>
          </View>
          <TouchableOpacity onPress={toggle} testID="theme-toggle-btn" style={{ padding: 6 }}>
            <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <View style={{ marginTop: 40 }}>
            <Text style={{ ...typography.caption, color: theme.primary }}>Built on DPIIT Vision</Text>
            <Text style={{ ...typography.h1, color: theme.text, marginTop: 8, fontSize: 44 }}>Where India&apos;s next unicorn starts.</Text>
            <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 12 }}>
              Connect Future Founders, Future Partners, and Growing Startups on one futuristic platform.
            </Text>
          </View>

          <View style={{ marginTop: 60, gap: 12 }}>
            <Btn testID="get-started-btn" title="Get Started" onPress={() => router.push("/(auth)/role")} />
            <Btn testID="login-btn" title="I already have an account" variant="outline" onPress={() => router.push("/(auth)/login")} />
          </View>

          <View style={{ marginTop: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 20, height: 2, backgroundColor: theme.primary }} />
            <Text style={{ color: theme.textFaint, fontSize: 10, letterSpacing: 3, fontWeight: "600" }}>MADE IN INDIA · 24H FREE TRIAL</Text>
            <View style={{ width: 20, height: 2, backgroundColor: theme.secondary }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
