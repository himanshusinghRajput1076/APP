/**
 * Support & Help — create ticket and view previous tickets.
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Card, Badge, Btn, Input, Chip } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

const CATEGORIES = [
  { key: "pitching", label: "Pitching Help", icon: "megaphone" },
  { key: "company_registration", label: "Company Setup", icon: "business" },
  { key: "investor_intro", label: "Investor Intro", icon: "people" },
  { key: "kyc", label: "KYC Issue", icon: "shield" },
  { key: "billing", label: "Billing", icon: "card" },
  { key: "general", label: "General", icon: "help-buoy" },
];

export default function Support() {
  const { theme } = useTheme();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/support");
      setTickets(r.data.tickets || []);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!subject || !message) return;
    setLoading(true);
    try {
      await api.post("/support", { subject, category, message });
      setSubject(""); setMessage(""); setCategory("general");
      load();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
            <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
              <Ionicons name="chevron-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>SUPPORT & HELP</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={{ ...typography.h1, color: theme.text }}>How can we help?</Text>
            <Text style={{ color: theme.textMuted, marginTop: 6 }}>
              Get end-to-end services for pitching, company registration, mentorship & more.
            </Text>

            <Card style={{ marginTop: 20 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 12 }}>WHAT DO YOU NEED?</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <Chip key={c.key} label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} testID={`cat-${c.key}`} />
                ))}
              </View>

              <View style={{ marginTop: 16, gap: 14 }}>
                <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="Short summary" testID="support-subject" />
                <Input label="Message" value={message} onChangeText={setMessage} placeholder="Describe your request..." multiline numberOfLines={4} testID="support-message" />
                <Btn testID="support-submit" title="Submit Request" onPress={submit} loading={loading} />
              </View>
            </Card>

            <Card style={{ marginTop: 16 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>OUR CONTACT</Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                <ContactRow icon="mail" label="support@ideacon.in" />
                <ContactRow icon="call" label="+91 90000 00000" />
                <ContactRow icon="location" label="Made in India · DPIIT Vision" />
              </View>
            </Card>

            <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: 24 }}>YOUR TICKETS</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {tickets.length === 0 ? (
                <Text style={{ color: theme.textFaint }}>No tickets yet.</Text>
              ) : tickets.map((t) => (
                <Card key={t.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{t.subject}</Text>
                    <Badge text={(t.status || "OPEN").toUpperCase()} color={t.status === "open" ? theme.warning : theme.secondary} />
                  </View>
                  <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 12 }}>{t.category} · {new Date(t.created_at).toLocaleDateString()}</Text>
                  <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }} numberOfLines={2}>{t.message}</Text>
                </Card>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function ContactRow({ icon, label }: { icon: any; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={16} color={theme.primary} />
      <Text style={{ color: theme.text }}>{label}</Text>
    </View>
  );
}
