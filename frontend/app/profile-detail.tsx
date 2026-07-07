/**
 * Profile detail — public view of another user (from Discover).
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Card, Badge, Btn } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function ProfileDetail() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get(`/portfolio/${id}`).then(r => setProfile(r.data)).catch(() => {});
  }, [id]);

  if (!profile) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const roleColor = profile.role === "investor" ? theme.secondary : theme.primary;
  const roleLabel = profile.role === "investor" ? "FUTURE PARTNER" : profile.role === "student" ? "FUTURE FOUNDER" : "GROWING STARTUP";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: roleColor, overflow: "hidden", backgroundColor: theme.glass, alignItems: "center", justifyContent: "center" }}>
              {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: "100%", height: "100%" }} /> : <Ionicons name="person" size={54} color={theme.textFaint} />}
            </View>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
              <Badge text={roleLabel} color={roleColor} />
              {profile.subscription_tier === "pro" ? <Badge text="PRO" color={theme.secondary} /> : null}
            </View>
            <Text style={{ color: theme.text, fontSize: 26, fontWeight: "900", marginTop: 8 }}>{profile.name}</Text>
            {profile.sector ? <Text style={{ color: theme.textMuted, marginTop: 4 }}>{profile.sector}</Text> : null}
          </View>

          <Card style={{ marginTop: 24 }}>
            <Text style={{ ...typography.caption, color: theme.textMuted }}>ABOUT</Text>
            <Text style={{ color: theme.text, marginTop: 8, lineHeight: 22 }}>{profile.bio || "No bio provided yet."}</Text>
          </Card>

          {profile.role === "investor" && profile.investment_amount ? (
            <Card style={{ marginTop: 12 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>INVESTMENT TICKET</Text>
              <Text style={{ color: theme.secondary, fontSize: 26, fontWeight: "900", marginTop: 4 }}>₹{profile.investment_amount.toLocaleString("en-IN")}</Text>
            </Card>
          ) : null}

          {profile.company_name ? (
            <Card style={{ marginTop: 12 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>COMPANY</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginTop: 4 }}>{profile.company_name}</Text>
            </Card>
          ) : null}

          {profile.website ? (
            <Card style={{ marginTop: 12 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>WEBSITE</Text>
              <Text style={{ color: theme.primary, marginTop: 4 }} numberOfLines={1}>{profile.website}</Text>
            </Card>
          ) : null}

          <Card style={{ marginTop: 12, borderColor: theme.warning }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="lock-closed" size={14} color={theme.warning} />
              <Text style={{ color: theme.textMuted, fontSize: 12, flex: 1 }}>
                Contact details (email/phone) are hidden. Please connect via IDEACON chat.
              </Text>
            </View>
          </Card>

          <View style={{ marginTop: 20 }}>
            <Btn
              testID="start-chat-btn"
              title="Start Chat"
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: profile.id, name: profile.name } })}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
