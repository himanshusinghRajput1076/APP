/**
 * Idea Pitch feed — founders post, all users view, with Gemini AI feedback.
 */
import React, { useEffect, useState, useCallback, memo } from "react";
import { View, Text, TouchableOpacity, RefreshControl, Modal, KeyboardAvoidingView, Platform, Image, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography } from "@/src/theme/tokens";
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

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PitchCard 
      pitch={item} 
      onLike={async () => { await api.post(`/pitch/${item.id}/like`); load(); }} 
    />
  ), [load]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>IDEA PITCHES</Text>
            <Text style={{ ...typography.h1, color: theme.text, marginTop: 4 }}>The Pitch Feed</Text>
            <Text style={{ color: theme.textMuted, marginTop: 4 }}>Ideas from founders, analyzed by Gemini AI.</Text>
          </View>
        </View>

        <FlatList
          data={pitches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
          initialNumToRender={5}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={{ alignItems: "center", padding: 40 }}>
              <Ionicons name="bulb-outline" size={44} color={theme.textFaint} />
              <Text style={{ color: theme.textMuted, marginTop: 12 }}>No ideas pitched yet. Be the first!</Text>
            </View>
          }
        />

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

const PitchCard = memo(({ pitch, onLike }: { pitch: any; onLike: () => void }) => {
  const { theme } = useTheme();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiData, setAiData] = useState<any>(pitch.ai_analysis || null);

  const requestAnalysis = async () => {
    setAnalyzing(true);
    try {
      const r = await api.post(`/pitch/analyze/${pitch.id}`);
      setAiData(r.data.analysis);
    } catch {
      // handled
    }
    setAnalyzing(false);
  };

  return (
    <Card style={{ padding: spacing.md, marginBottom: 12 }}>
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

      {/* AI Analysis Section */}
      {aiData ? (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: theme.glass, borderRadius: 12, borderWidth: 1, borderColor: theme.primary + "40" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Ionicons name="sparkles" size={14} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>GEMINI ANALYSIS</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ color: theme.text, fontWeight: "700" }}>Score: {aiData.score}/100</Text>
          </View>
          
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600", marginTop: 4 }}>Strengths:</Text>
          {aiData.strengths?.map((s: string, i: number) => <Text key={i} style={{ color: theme.textMuted, fontSize: 12 }}>• {s}</Text>)}
          
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600", marginTop: 8 }}>Weaknesses:</Text>
          {aiData.weaknesses?.map((w: string, i: number) => <Text key={i} style={{ color: theme.textMuted, fontSize: 12 }}>• {w}</Text>)}
        </View>
      ) : (
        <TouchableOpacity 
          onPress={requestAnalysis} 
          disabled={analyzing}
          style={{ marginTop: 12, padding: 8, backgroundColor: theme.glass, borderRadius: 8, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}
        >
          {analyzing ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="sparkles" size={14} color={theme.primary} />}
          <Text style={{ color: theme.primary, fontWeight: "600", fontSize: 12 }}>{analyzing ? "Gemini is analyzing..." : "Analyze with Gemini AI"}</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        <TouchableOpacity onPress={onLike} testID={`like-${pitch.id}`} style={{ flexDirection: "row", gap: 6, alignItems: "center", padding: 4 }}>
          <Ionicons name="flame" size={18} color={theme.primary} />
          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600" }}>{pitch.likes || 0}</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.textFaint, fontSize: 11 }}>{new Date(pitch.created_at).toLocaleDateString()}</Text>
      </View>
    </Card>
  );
});
PitchCard.displayName = 'PitchCard';

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
            <FlatList
              data={[]}
              renderItem={() => null}
              ListHeaderComponent={
                <View style={{ padding: spacing.lg, gap: 16 }}>
                  <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g., AI-powered rural healthcare" testID="pitch-title" />
                  <Input label="Description" value={description} onChangeText={setDescription} placeholder="What problem does it solve?" multiline numberOfLines={4} testID="pitch-desc" />
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...typography.caption, color: theme.textMuted }}>SECTOR</Text>
                    <FlatList 
                      data={sectors.slice(0, 15)}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={s => s}
                      renderItem={({item}) => (
                        <View style={{ marginRight: 8 }}>
                          <Chip label={item.split(" & ")[0]} active={sector === item} onPress={() => setSector(item)} testID={`sector-${item.split(" ")[0].toLowerCase()}`} />
                        </View>
                      )}
                    />
                  </View>
                  <Input label="Funding Ask (₹, optional)" value={ask} onChangeText={setAsk} placeholder="e.g., 500000" keyboardType="number-pad" testID="pitch-ask" />
                  {error ? <Text style={{ color: theme.error }}>{error}</Text> : null}
                  <Btn title="Post Pitch" onPress={submit} loading={loading} testID="pitch-submit-btn" />
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
