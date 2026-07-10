/**
 * KYC View — displays the user's KYC status & data.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography } from "@/src/theme/tokens";
import { Card, Badge, Btn } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function KYCView() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [kyc, setKyc] = useState<any>(null);

  useEffect(() => {
    api.get("/kyc/status").then(r => setKyc(r.data)).catch(() => {});
  }, []);

  if (!user) return null;

  const status = user.kyc_status || "pending";
  const color = status === "approved" ? theme.secondary : status === "rejected" ? theme.error : theme.warning;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>KYC</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={{ ...typography.h1, color: theme.text }}>KYC Status</Text>

          <Card style={{ marginTop: 20, borderColor: color }}>
            <Badge text={status.toUpperCase()} color={color} />
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginTop: 8 }}>
              {status === "approved" ? "Your account is verified." :
               status === "submitted" ? "Under review by our team." :
               status === "rejected" ? "Verification failed — please resubmit." : "KYC not started yet."}
            </Text>
          </Card>

          {kyc?.kyc ? (
            <Card style={{ marginTop: 12 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>SUBMITTED DETAILS</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                <Row label="PAN" value={kyc.kyc.pan} />
                <Row label="Aadhar" value={kyc.kyc.aadhar ? `XXXX XXXX ${kyc.kyc.aadhar.slice(-4)}` : "—"} />
                <Row label="Mobile" value={kyc.kyc.mobile} />
                <Row label="Institution" value={kyc.kyc.college_or_school_name || "—"} />
              </View>
              {kyc.kyc.id_photo ? (
                <Image source={{ uri: kyc.kyc.id_photo }} style={{ width: "100%", height: 180, marginTop: 12, borderRadius: 6 }} resizeMode="cover" />
              ) : null}
            </Card>
          ) : null}

          <View style={{ marginTop: 20 }}>
            <Btn
              testID="kyc-restart-btn"
              title={status === "pending" || status === "rejected" ? "Complete KYC" : "Update KYC"}
              onPress={() => router.push("/(auth)/kyc")}
              variant={status === "approved" ? "outline" : "primary"}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
