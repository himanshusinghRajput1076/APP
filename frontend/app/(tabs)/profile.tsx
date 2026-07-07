/**
 * Profile / Portfolio management screen.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Chip, Input, Badge } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

async function pickImageBase64(): Promise<string | null> {
  try {
    const ImagePicker = await import("expo-image-picker");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true, allowsEditing: true, aspect: [1,1] });
    if (r.canceled || !r.assets?.[0]?.base64) return null;
    return `data:image/jpeg;base64,${r.assets[0].base64}`;
  } catch { return null; }
}

export default function Profile() {
  const { theme, toggle, mode } = useTheme();
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [sector, setSector] = useState(user?.sector || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [linkedin, setLinkedin] = useState(user?.linkedin || "");
  const [companyName, setCompanyName] = useState(user?.company_name || "");
  const [amount, setAmount] = useState(user?.investment_amount ? String(user.investment_amount) : "");
  const [photo, setPhoto] = useState<string | null>(user?.photo || null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/sectors").then(r => setSectors(r.data.sectors)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setSector(user.sector || "");
      setWebsite(user.website || "");
      setLinkedin(user.linkedin || "");
      setCompanyName(user.company_name || "");
      setAmount(user.investment_amount ? String(user.investment_amount) : "");
      setPhoto(user.photo || null);
    }
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/portfolio/update", {
        bio, sector, website, linkedin, photo,
        company_name: companyName || undefined,
        investment_amount: amount ? parseFloat(amount) : undefined,
      });
      await refresh();
      setEditing(false);
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const roleLabel = user.role === "student" ? "FUTURE FOUNDER" : user.role === "investor" ? "FUTURE PARTNER" : "GROWING STARTUP";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>PROFILE & PORTFOLIO</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity testID="toggle-theme-profile" onPress={toggle}>
                  <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity testID="logout-profile" onPress={signOut}>
                  <Ionicons name="log-out-outline" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar + Name */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <TouchableOpacity
                testID="edit-photo-btn"
                disabled={!editing}
                onPress={async () => { const p = await pickImageBase64(); if (p) setPhoto(p); }}
                style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: theme.primary, overflow: "hidden", backgroundColor: theme.glass, alignItems: "center", justifyContent: "center" }}
              >
                {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} /> : <Ionicons name="person" size={40} color={theme.textFaint} />}
                {editing ? (
                  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.overlay, padding: 4, alignItems: "center" }}>
                    <Ionicons name="camera" size={12} color={theme.text} />
                  </View>
                ) : null}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>{user.name}</Text>
                <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 2, fontWeight: "700", marginTop: 4 }}>{roleLabel}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <Badge text={user.kyc_status.toUpperCase()} color={user.kyc_status === "approved" ? theme.secondary : theme.warning} />
                  {user.subscription?.tier === "pro" ? <Badge text="PRO" color={theme.secondary} /> : null}
                </View>
              </View>
            </View>

            {/* Quick actions row */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <Btn title="Digital ID Card" onPress={() => router.push("/id-card")} small testID="my-idcard-btn" style={{ flex: 1 }} variant="outline" />
              <Btn title="Subscription" onPress={() => router.push("/subscription")} small testID="my-sub-btn" style={{ flex: 1 }} />
            </View>

            {/* Portfolio card */}
            <Card style={{ marginTop: spacing.lg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ ...typography.caption, color: theme.textMuted }}>PORTFOLIO</Text>
                <TouchableOpacity testID="edit-profile-btn" onPress={() => setEditing(!editing)}>
                  <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 12 }}>{editing ? "CANCEL" : "EDIT"}</Text>
                </TouchableOpacity>
              </View>

              {!editing ? (
                <View style={{ gap: 12 }}>
                  <Field label="Bio" value={user.bio || "—"} />
                  <Field label="Sector" value={user.sector || "—"} />
                  {user.role !== "student" && <Field label="Company" value={user.company_name || "—"} />}
                  {user.role === "investor" && <Field label="Investment Amount" value={user.investment_amount ? `₹${user.investment_amount.toLocaleString("en-IN")}` : "—"} />}
                  <Field label="Website" value={user.website || "—"} />
                  <Field label="LinkedIn" value={user.linkedin || "—"} />
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} testID="edit-bio" placeholder="Tell your story..." />
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...typography.caption, color: theme.textMuted }}>SECTOR</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {sectors.slice(0, 20).map((s) => (
                        <Chip key={s} label={s.split(" & ")[0]} active={sector === s} onPress={() => setSector(s)} testID={`sec-${s.split(" ")[0].toLowerCase()}`} />
                      ))}
                    </ScrollView>
                  </View>
                  {user.role !== "student" && <Input label="Company Name" value={companyName} onChangeText={setCompanyName} testID="edit-company" />}
                  {user.role === "investor" && <Input label="Investment Amount (₹)" value={amount} onChangeText={setAmount} testID="edit-amount" keyboardType="number-pad" />}
                  <Input label="Website" value={website} onChangeText={setWebsite} testID="edit-website" placeholder="https://" autoCapitalize="none" />
                  <Input label="LinkedIn" value={linkedin} onChangeText={setLinkedin} testID="edit-linkedin" placeholder="linkedin.com/in/..." autoCapitalize="none" />
                  <Btn title="Save Portfolio" onPress={save} loading={saving} testID="save-portfolio-btn" />
                </View>
              )}
            </Card>

            {/* KYC status */}
            <Card style={{ marginTop: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ ...typography.caption, color: theme.textMuted }}>KYC STATUS</Text>
                  <Text style={{ color: theme.text, fontWeight: "700", marginTop: 4 }}>{user.kyc_status.toUpperCase()}</Text>
                </View>
                <TouchableOpacity testID="kyc-nav-btn" onPress={() => router.push("/(auth)/kyc")}>
                  <Text style={{ color: theme.primary, fontWeight: "700" }}>{user.kyc_status === "pending" ? "START →" : "UPDATE →"}</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <Card style={{ marginTop: spacing.md }}>
              <TouchableOpacity testID="support-nav-btn" onPress={() => router.push("/support")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="help-circle-outline" size={22} color={theme.text} />
                  <Text style={{ color: theme.text, fontWeight: "700" }}>Support & Help</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={{ ...typography.caption, color: theme.textMuted }}>{label.toUpperCase()}</Text>
      <Text style={{ color: theme.text, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
