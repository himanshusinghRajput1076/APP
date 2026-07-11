import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Btn, Card, Input } from "@/src/components/ui";
import { typography, spacing, radius } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function ToolsScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"seedforge" | "pabbly">("seedforge");

  // Pabbly State
  const [webhookUrl, setWebhookUrl] = useState("");
  const [pabblyLoading, setPabblyLoading] = useState(false);

  // SeedForge State
  const [roundName, setRoundName] = useState("");
  const [amount, setAmount] = useState("");
  const [valuation, setValuation] = useState("");
  const [rounds, setRounds] = useState<any[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pabblyRes, seedRes] = await Promise.all([
        api.get("/pabbly/config"),
        api.get("/seedforge/rounds")
      ]);
      setWebhookUrl(pabblyRes.data?.webhook_url || "");
      setRounds(seedRes.data?.rounds || []);
    } catch (e) {
      console.error(e);
    }
  };

  const savePabbly = async () => {
    setPabblyLoading(true);
    try {
      await api.post("/pabbly/config", {
        webhook_url: webhookUrl,
        events: ["kyc_approved", "funding_round_added"]
      });
      Alert.alert("Success", "Pabbly Connect Webhook saved!");
    } catch (e) {
      Alert.alert("Error", "Failed to save webhook");
    } finally {
      setPabblyLoading(false);
    }
  };

  const addRound = async () => {
    if (!roundName || !amount || !valuation) return Alert.alert("Error", "Please fill all fields");
    setSeedLoading(true);
    try {
      await api.post("/seedforge/rounds", {
        round_name: roundName,
        amount_raised: parseFloat(amount),
        valuation: parseFloat(valuation),
        date: new Date().toISOString(),
        investors: []
      });
      setRoundName("");
      setAmount("");
      setValuation("");
      fetchData();
      Alert.alert("Success", "Funding round added! (Webhook fired if Pabbly configured)");
    } catch (e) {
      Alert.alert("Error", "Failed to add round");
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <View style={{ padding: spacing.md }}>
        <Text style={{ ...typography.h1, color: theme.text }}>Integrations</Text>
        <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 4 }}>
          SeedForge Equity & Pabbly Automations
        </Text>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: spacing.md, gap: 12, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setActiveTab("seedforge")}
          style={{
            flex: 1, padding: 12, borderRadius: radius.sm, alignItems: "center",
            backgroundColor: activeTab === "seedforge" ? theme.primary : theme.primaryDim,
          }}
        >
          <Text style={{ color: activeTab === "seedforge" ? "#fff" : theme.primary, fontWeight: "700" }}>
            SeedForge
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("pabbly")}
          style={{
            flex: 1, padding: 12, borderRadius: radius.sm, alignItems: "center",
            backgroundColor: activeTab === "pabbly" ? theme.secondary : theme.card,
            borderWidth: activeTab === "pabbly" ? 0 : 1, borderColor: theme.border
          }}
        >
          <Text style={{ color: activeTab === "pabbly" ? "#fff" : theme.text, fontWeight: "700" }}>
            Pabbly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        {activeTab === "seedforge" ? (
          <View style={{ gap: 16 }}>
            <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Ionicons name="pie-chart" size={24} color={theme.primary} />
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 18 }}>Add Funding Round</Text>
              </View>
              
              <View style={{ gap: 12 }}>
                <Input label="Round Name (e.g. Pre-Seed)" value={roundName} onChangeText={setRoundName} />
                <Input label="Amount Raised (₹)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
                <Input label="Valuation (₹)" value={valuation} onChangeText={setValuation} keyboardType="numeric" />
                <Btn title="Save Round" onPress={addRound} loading={seedLoading} />
              </View>
            </Card>

            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 18, marginTop: 16 }}>Cap Table History</Text>
            {rounds.map((r, i) => (
              <Card key={i} style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 16 }}>{r.round_name}</Text>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>Raised: ₹{r.amount_raised}</Text>
                <Text style={{ color: theme.textMuted }}>Valuation: ₹{r.valuation}</Text>
              </Card>
            ))}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Ionicons name="flash" size={24} color={theme.secondary} />
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 18 }}>Pabbly Connect Webhook</Text>
              </View>
              <Text style={{ color: theme.textMuted, marginBottom: 16, fontSize: 13, lineHeight: 20 }}>
                Paste your Pabbly webhook URL here. We will automatically send a JSON payload whenever a major event happens in your account (e.g. KYC approved, Funding round added).
              </Text>
              
              <Input 
                label="Webhook URL" 
                value={webhookUrl} 
                onChangeText={setWebhookUrl} 
                placeholder="https://connect.pabbly.com/workflow/sendwebhookdata/..." 
              />
              <Btn title="Save Configuration" onPress={savePabbly} loading={pabblyLoading} style={{ backgroundColor: theme.secondary, marginTop: 12 }} />
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
