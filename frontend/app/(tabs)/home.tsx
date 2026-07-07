/**
 * Home dashboard — role-specific overview.
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Badge, Chip } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

function timeLeft(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime() - Date.now();
  if (d <= 0) return "expired";
  const h = Math.floor(d / (1000 * 60 * 60));
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export default function Home() {
  const { theme, toggle, mode } = useTheme();
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({});

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      // Fetch role-based quick data
      const [pitches] = await Promise.all([
        api.get("/pitch").catch(() => ({ data: { pitches: [] } })),
      ]);
      setStats({ pitches: pitches.data.pitches?.length || 0 });
    } finally { setRefreshing(false); }
  }, [refresh]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const roleLabel = user.role === "student" ? "FUTURE FOUNDER" : user.role === "investor" ? "FUTURE PARTNER" : user.role === "growing_startup" ? "GROWING STARTUP" : "ADMIN";
  const trial = user.trial_expires_at ? timeLeft(user.trial_expires_at) : "";
  const sub = user.subscription;
  const isPro = sub?.tier === "pro";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Sticky header */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>{roleLabel}</Text>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800", marginTop: 2 }}>Hi, {user.name?.split(" ")[0] || "founder"} 👋</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity testID="theme-toggle" onPress={toggle} style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity testID="logout-btn" onPress={signOut} style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="log-out-outline" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
        >
          {/* Trial/Sub banner */}
          <Card style={{
            borderColor: isPro ? theme.secondary : theme.primary,
            backgroundColor: theme.surface,
            borderWidth: 1,
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                {sub ? (
                  <>
                    <Badge text={isPro ? "PRO MEMBER" : "MEMBER"} color={isPro ? theme.secondary : theme.primary} />
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 8 }}>{sub.plan_id.replace("_", " · ").toUpperCase()}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                      {sub.limit} discovery slots · Expires {timeLeft(sub.expires_at)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Badge text={trial === "expired" ? "TRIAL EXPIRED" : "FREE TRIAL"} color={trial === "expired" ? theme.error : theme.primary} />
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 8 }}>{trial === "expired" ? "Upgrade to continue" : "24h free access"}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                      {trial === "expired" ? "Subscribe to unlock features" : `${trial} · Explore 5 profiles`}
                    </Text>
                  </>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.textMuted, fontSize: 10, letterSpacing: 2 }}>CREDITS</Text>
                <Text style={{ color: theme.secondary, fontSize: 26, fontWeight: "900", marginTop: 2 }}>{user.credits}</Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <Btn testID="upgrade-btn" title={sub ? "Manage Plan" : "View Plans"} onPress={() => router.push("/subscription")} small />
            </View>
          </Card>

          {/* Quick actions */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 12 }}>QUICK ACTIONS</Text>
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <QuickAction testID="qa-idcard" icon="card" label="Digital ID" onPress={() => router.push("/id-card")} color={theme.primary} />
              <QuickAction testID="qa-discover" icon="search" label={user.role === "investor" ? "Founders" : "Investors"} onPress={() => router.push("/(tabs)/discover")} color={theme.secondary} />
              <QuickAction testID="qa-pitch" icon="rocket" label="Ideas" onPress={() => router.push("/(tabs)/pitch")} color={theme.primary} />
              <QuickAction testID="qa-portfolio" icon="briefcase" label="Portfolio" onPress={() => router.push("/(tabs)/profile")} color={theme.secondary} />
              <QuickAction testID="qa-support" icon="help-circle" label="Support" onPress={() => router.push("/support")} color={theme.primary} />
              <QuickAction testID="qa-kyc" icon="shield-checkmark" label="KYC" onPress={() => router.push("/kyc-view")} color={theme.secondary} />
            </View>
          </View>

          {/* KYC status alert */}
          {user.kyc_status === "pending" ? (
            <Card style={{ marginTop: spacing.md, borderColor: theme.warning }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="warning" size={22} color={theme.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>KYC Required</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>Complete KYC to unlock full features & security.</Text>
                </View>
                <TouchableOpacity testID="do-kyc-btn" onPress={() => router.push("/(auth)/kyc")}>
                  <Text style={{ color: theme.primary, fontWeight: "700" }}>START →</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : null}

          {/* Bento grid stats */}
          <View style={{ marginTop: spacing.lg, flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            <StatCell label="LIVE PITCHES" value={String(stats.pitches || 0)} color={theme.primary} width="48%" />
            <StatCell label="YOUR CREDITS" value={String(user.credits || 0)} color={theme.secondary} width="48%" />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Card style={{ backgroundColor: theme.surface }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>DPIIT REGISTERED VISION</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginTop: 4 }}>Built for Startup India.</Text>
              <Text style={{ color: theme.textMuted, marginTop: 6 }}>
                IDEACON connects founders, capital, and mentorship on one futuristic platform — powered by DPIIT vision.
              </Text>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function QuickAction({ icon, label, onPress, color, testID }: { icon: any; label: string; onPress: () => void; color: string; testID?: string }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={{
        width: "31%",
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 12,
        justifyContent: "space-between",
        backgroundColor: theme.surface,
      }}
    >
      <View style={{ width: 32, height: 32, backgroundColor: `${color}22`, borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12, letterSpacing: 0.3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCell({ label, value, color, width }: { label: string; value: string; color: string; width: any }) {
  const { theme } = useTheme();
  return (
    <View style={{
      width,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      minHeight: 100,
      justifyContent: "space-between",
    }}>
      <Text style={{ color: theme.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color, fontSize: 34, fontWeight: "900" }}>{value}</Text>
    </View>
  );
}
