/**
 * Role Picker — pick between Student, Investor, Growing Startup.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";

type RoleOption = {
  key: "student" | "investor" | "growing_startup";
  title: string;
  subtitle: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: "primary" | "secondary";
};

export default function RolePicker() {
  const { theme } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<RoleOption["key"] | null>(null);

  const roles: RoleOption[] = [
    { key: "student", title: "Future Founder", subtitle: "STUDENTS · IDEATION STAGE",
      desc: "You have a spark of an idea and want to build a startup.",
      icon: "school-outline", color: "primary" },
    { key: "investor", title: "Future Partner", subtitle: "INVESTORS · CAPITAL",
      desc: "You want to discover and fund the next generation of founders.",
      icon: "briefcase-outline", color: "secondary" },
    { key: "growing_startup", title: "Growing Startup", subtitle: "REGISTERED COMPANIES",
      desc: "Your company is live and you're scaling operations & fundraising.",
      icon: "rocket-outline", color: "primary" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>STEP 01 OF 03</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ ...typography.h1, color: theme.text }}>Who are you today?</Text>
        <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 8 }}>
          Choose the panel that matches your journey. You can switch or add profiles later.
        </Text>

        <View style={{ marginTop: 32, gap: 14 }}>
          {roles.map((r) => {
            const active = selected === r.key;
            const c = r.color === "primary" ? theme.primary : theme.secondary;
            return (
              <TouchableOpacity
                key={r.key}
                testID={`role-${r.key}`}
                onPress={() => setSelected(r.key)}
                activeOpacity={0.9}
                style={{
                  borderWidth: 1,
                  borderColor: active ? c : theme.border,
                  backgroundColor: active ? `${c}12` : theme.surface,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  flexDirection: "row",
                  gap: spacing.md,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderWidth: 1, borderColor: c,
                  alignItems: "center", justifyContent: "center", backgroundColor: `${c}22`,
                }}>
                  <Ionicons name={r.icon} size={22} color={c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c, fontSize: 10, letterSpacing: 2, fontWeight: "700" }}>{r.subtitle}</Text>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 2 }}>{r.title}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{r.desc}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={c} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 40 }}>
          <Btn
            title="Continue"
            testID="continue-btn"
            disabled={!selected}
            onPress={() => selected && router.push({ pathname: "/(auth)/signup", params: { role: selected } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
