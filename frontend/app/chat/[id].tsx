/**
 * Individual chat conversation with WebSocket for real-time messaging.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { api, wsUrl, TOKEN_KEY } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

export default function ChatDetail() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const otherId = params.id!;

  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<FlatList<any>>(null);

  // Load history
  useEffect(() => {
    api.get(`/chat/${otherId}`).then(r => {
      setMessages(r.data.messages || []);
      setOther(r.data.other);
    }).catch(() => {});
  }, [otherId]);

  // Open WS
  useEffect(() => {
    let ws: WebSocket | null = null;
    (async () => {
      if (!user) return;
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      if (!token) return;
      ws = new WebSocket(wsUrl(user.id, token));
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "message" && data.message) {
            const m = data.message;
            // Only append messages for this convo
            if (m.sender_id === otherId || m.receiver_id === otherId) {
              setMessages((prev) => {
                if (prev.some(x => x.id === m.id)) return prev;
                return [...prev, m];
              });
            }
          }
        } catch { /* ignore */ }
      };
    })();
    return () => { ws?.close(); };
  }, [user, otherId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    // Send via WS if open, else via HTTP
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", receiver_id: otherId, text: t }));
    } else {
      try {
        const r = await api.post("/chat/send", { receiver_id: otherId, text: t });
        setMessages((prev) => [...prev, r.data]);
      } catch { /* ignore */ }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={0}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.glass, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {other?.photo ? <Image source={{ uri: other.photo }} style={{ width: "100%", height: "100%" }} /> : <Ionicons name="person" size={20} color={theme.textFaint} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>{other?.name || params.name || "Chat"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connected ? theme.secondary : theme.textFaint }} />
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>{connected ? "connected" : "offline"}</Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={scrollRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.md, gap: 8 }}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              return (
                <View style={{ maxWidth: "80%", alignSelf: mine ? "flex-end" : "flex-start" }}>
                  <View style={{
                    backgroundColor: mine ? theme.primary : theme.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: theme.border,
                    padding: 10,
                    borderRadius: 12,
                    borderTopRightRadius: mine ? 2 : 12,
                    borderTopLeftRadius: mine ? 12 : 2,
                  }}>
                    <Text style={{ color: mine ? "#050505" : theme.text, fontSize: 14 }}>{item.text}</Text>
                  </View>
                  <Text style={{ color: theme.textFaint, fontSize: 10, marginTop: 2, alignSelf: mine ? "flex-end" : "flex-start" }}>
                    {new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: "center" }}>
                <Ionicons name="chatbubbles-outline" size={44} color={theme.textFaint} />
                <Text style={{ color: theme.textMuted, marginTop: 8 }}>Start the conversation</Text>
              </View>
            }
          />

          {/* Input */}
          <View style={{ flexDirection: "row", padding: spacing.md, gap: 8, borderTopWidth: 1, borderTopColor: theme.border, alignItems: "center" }}>
            <TextInput
              testID="chat-input"
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={theme.textFaint}
              style={{
                flex: 1, borderWidth: 1, borderColor: theme.borderStrong,
                borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10,
                color: theme.text, backgroundColor: theme.surface, fontSize: 14, minHeight: 42, maxHeight: 120,
              }}
              multiline
            />
            <TouchableOpacity
              testID="send-btn"
              onPress={send}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="send" size={18} color="#050505" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
