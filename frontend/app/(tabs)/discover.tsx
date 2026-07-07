/**
 * Discover — investors (for students/startups) or founders (for investors).
 * Limited by subscription plan. Contact details hidden (no email/mobile).
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Chip, Badge } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function Discover() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [limit, setLimit] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [d, s] = await Promise.all([
        api.get("/discover", { params: selectedSector ? { sector: selectedSector } : {} }),
        api.get("/sectors"),
      ]);
      setProfiles(d.data.profiles || []);
      setLimit(d.data.limit || 0);
      setHasAccess(d.data.has_access);
      setSectors(s.data.sectors || []);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [selectedSector]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const targetLabel = user.role === "investor" ? "Founders & Startups" : "Investors";
  const subtitle = user.role === "investor"
    ? "Discover the next unicorn founders."
    : "Meet investors ready to back your idea.";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>DISCOVER</Text>
          <Text style={{ ...typography.h1, color: theme.text, marginTop: 4 }}>{targetLabel}</Text>
          <Text style={{ color: theme.textMuted, marginTop: 4 }}>{subtitle}</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 12, alignItems: "center" }}>
            <Ionicons name="lock-closed" size={11} color={theme.textFaint} />
            <Text style={{ color: theme.textFaint, fontSize: 11 }}>
              Contact info hidden. Chat via IDEACON. Slots: {limit}
            </Text>
          </View>
        </View>

        {/* Sector chip row - horizontal, non-wrapping */}
        <View style={{ height: 56, justifyContent: "center" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8, alignItems: "center" }}
          >
            <Chip label="All" active={!selectedSector} onPress={() => setSelectedSector(null)} testID="chip-all" />
            {sectors.slice(0, 20).map((s) => (
              <Chip key={s} label={s.split(" & ")[0]} active={selectedSector === s} onPress={() => setSelectedSector(s)} testID={`chip-${s.split(" ")[0].toLowerCase()}`} />
            ))}
          </ScrollView>
        </View>

        {!hasAccess ? (
          <View style={{ padding: spacing.lg, flex: 1 }}>
            <Card style={{ borderColor: theme.primary }}>
              <Ionicons name="lock-closed" size={28} color={theme.primary} />
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 12 }}>Unlock Discovery</Text>
              <Text style={{ color: theme.textMuted, marginTop: 6 }}>
                Subscribe to view {user.role === "investor" ? "founders" : "investors"} matched to your sector.
              </Text>
              <View style={{ marginTop: 16 }}>
                <Btn testID="unlock-btn" title="See Plans" onPress={() => router.push("/subscription")} small />
              </View>
            </Card>
          </View>
        ) : (
          <FlatList
            data={profiles}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, paddingTop: 8 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
            ListEmptyComponent={
              <View style={{ alignItems: "center", padding: 40 }}>
                <Ionicons name="cube-outline" size={44} color={theme.textFaint} />
                <Text style={{ color: theme.textMuted, marginTop: 12 }}>No profiles yet in this sector.</Text>
              </View>
            }
            renderItem={({ item }) => <ProfileCard profile={item} onPress={() => router.push({ pathname: "/profile-detail", params: { id: item.id } })} />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function ProfileCard({ profile, onPress }: { profile: any; onPress: () => void }) {
  const { theme } = useTheme();
  const roleColor = profile.role === "investor" ? theme.secondary : theme.primary;
  const roleLabel = profile.role === "investor" ? "INVESTOR" : profile.role === "student" ? "FOUNDER" : "STARTUP";
  return (
    <TouchableOpacity onPress={onPress} testID={`profile-${profile.id}`} activeOpacity={0.85}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 90, height: 100, backgroundColor: theme.glass, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: theme.border }}>
            {profile.photo ? (
              <Image source={{ uri: profile.photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={34} color={theme.textFaint} />
            )}
          </View>
          <View style={{ flex: 1, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Badge text={roleLabel} color={roleColor} />
              {profile.subscription_tier === "pro" ? <Badge text="PRO" color={theme.secondary} /> : null}
            </View>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800", marginTop: 6 }}>{profile.name || "—"}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
              {profile.sector || "Sector N/A"}{profile.company_name ? ` · ${profile.company_name}` : ""}
            </Text>
            {profile.role === "investor" && profile.investment_amount ? (
              <Text style={{ color: theme.secondary, fontSize: 13, fontWeight: "700", marginTop: 4 }}>
                Ticket: ₹{profile.investment_amount.toLocaleString("en-IN")}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
