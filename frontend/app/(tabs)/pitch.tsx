/**
 * Idea Pitch feed — founders post, all users view.
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, KeyboardAvoidingView, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Chip, Input, Badge } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function Pitch() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [pitches, setPitches] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.get("/pitch");
      setPitches(r.data.pitches || []);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const canPost = user && (user.role === "student" || user.role === "growing_startup");

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>IDEA PITCHES</Text>
            <Text style={{ ...typography.h1, color: theme.text, marginTop: 4 }}>The Pitch Feed</Text>
            <Text style={{ color: theme.textMuted, marginTop: 4 }}>Ideas from founders, browsed by investors.</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
        >
          {pitches.length === 0 ? (
            <View style={{ alignItems: "center", padding: 40 }}>
              <Ionicons name="bulb-outline" size={44} color={theme.textFaint} />
              <Text style={{ color: theme.textMuted, marginTop: 12 }}>No ideas pitched yet. Be the first!</Text>
            </View>
          ) : (
            pitches.map((p) => <PitchCard key={p.id} pitch={p} onLike={async () => { await api.post(`/pitch/${p.id}/like`); load(); }} />)
          )}
        </ScrollView>

        {canPost ? (
          <TouchableOpacity
            testID="new-pitch-btn"
            onPress={() => setShowNew(true)}
            style={{
              position: "absolute", bottom: 90, right: spacing.lg,
              width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary,
              alignItems: "center", justifyContent: "center",
              shadowColor: theme.primary, shadowOpacity: 0.5, shadowRadius: 10,
            }}
          >
            <Ionicons name="add" size={28} color="#050505" />
          </TouchableOpacity>
        ) : null}

        <NewPitchModal visible={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      </SafeAreaView>
    </View>
  );
}

function PitchCard({ pitch, onLike }: { pitch: any; onLike: () => void }) {
  const { theme } = useTheme();
  return (
    <Card style={{ padding: spacing.md }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.glass, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {pitch.user_photo ? <Image source={{ uri: pitch.user_photo }} style={{ width: "100%", height: "100%" }} /> : <Ionicons name="person" size={18} color={theme.textFaint} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>{pitch.user_name}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 11 }}>{pitch.user_role === "student" ? "Future Founder" : "Growing Startup"}</Text>
        </View>
        <Badge text={pitch.sector?.split(" ")[0] || "IDEA"} color={theme.primary} />
      </View>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginTop: 12 }}>{pitch.title}</Text>
      <Text style={{ color: theme.textMuted, marginTop: 6, lineHeight: 20 }}>{pitch.description}</Text>
      {pitch.funding_ask ? (
        <Text style={{ color: theme.secondary, marginTop: 8, fontWeight: "700" }}>
          Seeking ₹{Number(pitch.funding_ask).toLocaleString("en-IN")}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
        <TouchableOpacity onPress={onLike} testID={`like-${pitch.id}`} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Ionicons name="flame" size={16} color={theme.primary} />
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>{pitch.likes || 0} igniters</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.textFaint, fontSize: 11 }}>{new Date(pitch.created_at).toLocaleDateString()}</Text>
      </View>
    </Card>
  );
}

function NewPitchModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [ask, setAsk] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (visible) { api.get("/sectors").then(r => setSectors(r.data.sectors)); } }, [visible]);

  const submit = async () => {
    setError(null);
    if (!title || !description || !sector) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      await api.post("/pitch", {
        title, description, sector,
        funding_ask: ask ? parseFloat(ask) : undefined,
      });
      setTitle(""); setDescription(""); setSector(""); setAsk("");
      onCreated(); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: theme.borderStrong, maxHeight: "88%" }}>
            <View style={{ padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Pitch Your Idea</Text>
              <TouchableOpacity testID="close-pitch-modal" onPress={onClose}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 16 }} keyboardShouldPersistTaps="handled">
              <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g., AI-powered rural healthcare" testID="pitch-title" />
              <Input label="Description" value={description} onChangeText={setDescription} placeholder="What problem does it solve?" multiline numberOfLines={4} testID="pitch-desc" />
              <View style={{ gap: 6 }}>
                <Text style={{ ...typography.caption, color: theme.textMuted }}>SECTOR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {sectors.slice(0, 15).map((s) => (
                    <Chip key={s} label={s.split(" & ")[0]} active={sector === s} onPress={() => setSector(s)} testID={`sector-${s.split(" ")[0].toLowerCase()}`} />
                  ))}
                </ScrollView>
              </View>
              <Input label="Funding Ask (₹, optional)" value={ask} onChangeText={setAsk} placeholder="e.g., 500000" keyboardType="number-pad" testID="pitch-ask" />
              {error ? <Text style={{ color: theme.error }}>{error}</Text> : null}
              <Btn title="Post Pitch" onPress={submit} loading={loading} testID="pitch-submit-btn" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
