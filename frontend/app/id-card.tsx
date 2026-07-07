/**
 * Digital ID Card — futuristic glassmorphic card with QR.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Badge } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

const { width } = Dimensions.get("window");
const CARD_W = width - spacing.lg * 2;
const CARD_H = CARD_W * 0.62;

export default function IdCard() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [card, setCard] = useState<any>(null);

  useEffect(() => {
    api.get("/id-card").then(r => setCard(r.data)).catch(() => {});
  }, []);

  if (!user || !card) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  const isPro = card.tier === "pro";
  const roleLabel = user.role === "student" ? "FUTURE FOUNDER" : user.role === "investor" ? "FUTURE PARTNER" : user.role === "growing_startup" ? "GROWING STARTUP" : "ADMIN";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>DIGITAL ID</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          <Text style={{ ...typography.h1, color: theme.text }}>Your Digital ID</Text>
          <Text style={{ color: theme.textMuted, marginTop: 6 }}>
            Government-grade credentials on the IDEACON ecosystem.
          </Text>

          {/* THE CARD */}
          <View testID="id-card-view" style={{
            width: CARD_W,
            height: CARD_H,
            marginTop: 24,
            borderRadius: 14,
            overflow: "hidden",
            borderWidth: isPro ? 2 : 1,
            borderColor: isPro ? theme.secondary : theme.borderStrong,
            backgroundColor: theme.surface,
            position: "relative",
          }}>
            <LinearGradient
              colors={mode === "dark"
                ? isPro
                  ? ["#0A2418", "#050505", "#1A0E00"]
                  : ["#0E0E0E", "#050505", "#1A0E00"]
                : isPro
                  ? ["#E8F5E9", "#FFFFFF", "#FFF3E0"]
                  : ["#F5F5F5", "#FFFFFF", "#FFF3E0"]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* corner bars */}
            <View style={{ position: "absolute", top: 0, left: 0, width: 40, height: 4, backgroundColor: theme.primary }} />
            <View style={{ position: "absolute", top: 0, right: 0, width: 4, height: 40, backgroundColor: theme.secondary }} />
            <View style={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 4, backgroundColor: theme.primary }} />
            <View style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: 40, backgroundColor: theme.secondary }} />

            <View style={{ flex: 1, flexDirection: "row", padding: 18 }}>
              {/* Left */}
              <View style={{ flex: 1, justifyContent: "space-between" }}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 20, height: 20, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#050505", fontWeight: "900", fontSize: 12 }}>I</Text>
                    </View>
                    <Text style={{ color: theme.text, fontWeight: "900", letterSpacing: 3, fontSize: 13 }}>IDEACON</Text>
                  </View>
                  <Text style={{ color: theme.textFaint, fontSize: 8, letterSpacing: 2, marginTop: 4 }}>MEMBER · {isPro ? "PRO" : "STANDARD"}</Text>
                </View>

                <View>
                  <Text style={{ color: theme.primary, fontSize: 9, letterSpacing: 2, fontWeight: "700" }}>{roleLabel}</Text>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900", marginTop: 4 }} numberOfLines={1}>{card.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{card.email}</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 20 }}>
                  <View>
                    <Text style={{ color: theme.textFaint, fontSize: 7, letterSpacing: 1 }}>MEMBER ID</Text>
                    <Text style={{ color: theme.text, fontFamily: "Courier", fontSize: 11, marginTop: 2, fontWeight: "700" }}>{card.member_id}</Text>
                  </View>
                  <View>
                    <Text style={{ color: theme.textFaint, fontSize: 7, letterSpacing: 1 }}>KYC</Text>
                    <Text style={{ color: card.kyc_status === "approved" ? theme.secondary : theme.warning, fontSize: 11, marginTop: 2, fontWeight: "700" }}>
                      {card.kyc_status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* QR */}
              <View style={{ width: 90, alignItems: "flex-end", justifyContent: "space-between" }}>
                {card.photo ? (
                  <Image source={{ uri: card.photo }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.primary }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center", backgroundColor: theme.glass }}>
                    <Ionicons name="person" size={20} color={theme.textFaint} />
                  </View>
                )}
                <View style={{ padding: 4, backgroundColor: "#FFFFFF", borderRadius: 3 }}>
                  <QRCode value={`ideacon:${card.member_id}`} size={64} backgroundColor="#FFFFFF" color="#050505" />
                </View>
              </View>
            </View>
          </View>

          {/* Info */}
          <Card style={{ marginTop: 20 }}>
            <Text style={{ ...typography.caption, color: theme.textMuted }}>DETAILS</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              <Row label="Issued" value={new Date(card.issued_at).toLocaleDateString()} />
              {card.expires_at ? <Row label="Expires" value={new Date(card.expires_at).toLocaleDateString()} /> : null}
              <Row label="Credits" value={String(card.credits)} valueColor={theme.secondary} />
              <Row label="Tier" value={card.tier?.toUpperCase()} valueColor={isPro ? theme.secondary : theme.primary} />
            </View>
          </Card>

          {!isPro ? (
            <Card style={{ marginTop: 16, borderColor: theme.primary }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="star" size={20} color={theme.primary} />
                <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }}>Upgrade to Pro for the premium ID card</Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Btn title="See Pro Plans" small onPress={() => router.push("/subscription")} testID="idcard-upgrade" />
              </View>
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: valueColor || theme.text, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
