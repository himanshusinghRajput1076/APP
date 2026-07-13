/**
 * Home dashboard — role-specific overview with time greetings, achievements, testimonials.
 */
import React, { useEffect, useState, useCallback, memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Share, Dimensions, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Badge } from "@/src/components/ui";
import { Skeleton, SkeletonList } from "@/src/components/Skeleton";
import { AchievementBadge, AchievementItem } from "@/src/components/AchievementBadge";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { timeGreeting } from "@/src/utils/greeting";
import { AdBanner } from "@/src/components/AdBanner";

const { width } = Dimensions.get("window");

function timeLeft(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime() - Date.now();
  if (d <= 0) return "expired";
  const h = Math.floor(d / (1000 * 60 * 60));
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

const TESTIMONIALS = [
  { name: "Ananya, Founder @ HealSpark", quote: "Closed our first ₹50L angel round in 3 weeks through IDEACON.", role: "student" },
  { name: "Rohan, Angel Partner", quote: "The pitch feed algorithm surfaces gems I'd never find on LinkedIn.", role: "investor" },
  { name: "Meera, CEO @ AgroCloud", quote: "The end-to-end fundraising service saved us 4 months of legwork.", role: "growing_startup" },
];

export default function Home() {
  const { theme, toggle, mode } = useTheme();
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [referral, setReferral] = useState<any>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      const [pitches, ach, ref] = await Promise.all([
        api.get("/pitch").catch(() => ({ data: { pitches: [] } })),
        api.get("/achievements").catch(() => ({ data: { achievements: [] } })),
        api.get("/referral").catch(() => ({ data: null })),
      ]);
      setStats({ pitches: pitches.data.pitches?.length || 0 });
      setAchievements(ach.data.achievements || []);
      setReferral(ref.data);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const roleLabel = user.role === "student" ? "FUTURE FOUNDER" : user.role === "investor" ? "FUTURE PARTNER" : user.role === "growing_startup" ? "GROWING STARTUP" : "ADMIN";
  const trial = user.trial_expires_at ? timeLeft(user.trial_expires_at) : "";
  const sub = user.subscription;
  const isPro = sub?.tier === "pro";
  const { greet, emoji, first } = timeGreeting(user.name);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const shareReferral = async () => {
    if (!referral?.code) return;
    try {
      await Share.share({
        message: `Join me on IDEACON-ORIGENIX — India's futuristic startup ecosystem. Use my referral code ${referral.code} to get ₹100 credits on your first subscription. Download the app now!`,
      });
    } catch { /* ignore */ }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Sticky header */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>{roleLabel}</Text>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800", marginTop: 2 }}>
              {greet}, {first || "founder"} {emoji}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity testID="theme-toggle" onPress={toggle} style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity testID="logout-btn" onPress={handleSignOut} style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="log-out-outline" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
        >
          {/* Trial/Sub banner */}
          {loading && !user ? (
            <Skeleton height={140} />
          ) : (
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
                  {user.role === "investor" && (user.ignite_tokens || 0) > 0 ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
                      <Ionicons name="flame" size={11} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "800" }}>{user.ignite_tokens}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <Btn testID="upgrade-btn" title={sub ? "Manage Plan" : "View Plans"} onPress={() => router.push("/subscription")} small />
              </View>
            </Card>
          )}

          {/* Referral card */}
          {referral?.code ? (
            <Card style={{ marginTop: spacing.md, borderColor: theme.secondary, backgroundColor: theme.secondaryDim }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="gift" size={14} color={theme.secondary} />
                    <Text style={{ ...typography.caption, color: theme.secondary }}>REFER & EARN</Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800", marginTop: 6 }}>
                    ₹100 credits for you + friend
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    {referral.paid_referrals || 0} paid · ₹{referral.credits_earned || 0} earned
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.secondary }}>
                    <Text style={{ color: theme.secondary, fontWeight: "900", letterSpacing: 2, fontSize: 14 }}>{referral.code}</Text>
                  </View>
                  <TouchableOpacity testID="share-referral" onPress={shareReferral} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="share-social" size={12} color={theme.secondary} />
                    <Text style={{ color: theme.secondary, fontSize: 11, fontWeight: "700" }}>SHARE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ) : null}

          {/* Quick actions */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 12 }}>QUICK ACTIONS</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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

          {/* Achievements */}
          <View style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>ACHIEVEMENTS</Text>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700" }}>{unlockedCount} / {achievements.length}</Text>
            </View>
            {loading ? (
              <Skeleton height={80} />
            ) : (
              <FlatList 
                data={achievements}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
                initialNumToRender={5}
                renderItem={({item}) => <AchievementBadge item={item} />}
              />
            )}
          </View>

          {/* Bento grid stats */}
          <View style={{ marginTop: spacing.lg, flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            <StatCell label="LIVE PITCHES" value={String(stats.pitches || 0)} color={theme.primary} width="48%" />
            <StatCell label="YOUR CREDITS" value={String(user.credits || 0)} color={theme.secondary} width="48%" />
          </View>

          {/* Testimonials */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 12 }}>SUCCESS STORIES</Text>
            <FlatList 
              data={TESTIMONIALS}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              initialNumToRender={2}
              renderItem={({item: t}) => (
                <View style={{ width: width - spacing.lg * 2 - 8, marginRight: 12 }}>
                  <Card style={{ padding: 18 }}>
                    <Ionicons name="chatbox-ellipses" size={20} color={theme.primary} />
                    <Text style={{ color: theme.text, fontSize: 15, marginTop: 8, lineHeight: 22, fontStyle: "italic" }}>
                      {"\u201C"}{t.quote}{"\u201D"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
                      <View style={{ width: 4, height: 24, backgroundColor: theme.primary }} />
                      <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: "700" }}>{t.name}</Text>
                    </View>
                  </Card>
                </View>
              )}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Card style={{ backgroundColor: theme.surface }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>DPIIT REGISTERED VISION</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginTop: 4 }}>Built for Startup India.</Text>
              <Text style={{ color: theme.textMuted, marginTop: 6 }}>
                IDEACON-ORIGENIX connects founders, capital, and mentorship on one futuristic platform — powered by DPIIT vision.
              </Text>
            </Card>
          </View>
          <AdBanner />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const QuickAction = memo(({ icon, label, onPress, color, testID }: { icon: any; label: string; onPress: () => void; color: string; testID?: string }) => {
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
});
QuickAction.displayName = 'QuickAction';

const StatCell = memo(({ label, value, color, width }: { label: string; value: string; color: string; width: any }) => {
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
});
StatCell.displayName = 'StatCell';
