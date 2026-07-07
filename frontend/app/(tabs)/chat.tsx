/**
 * Chat conversations list.
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { spacing, typography } from "@/src/theme/tokens";
import { Card, Badge } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function ChatList() {
  const { theme } = useTheme();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.get("/chat/list");
      setChats(r.data.chats || []);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>MESSAGES</Text>
          <Text style={{ ...typography.h1, color: theme.text, marginTop: 4 }}>Conversations</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
        >
          {chats.length === 0 ? (
            <View style={{ alignItems: "center", padding: 40 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color={theme.textFaint} />
              <Text style={{ color: theme.textMuted, marginTop: 12, textAlign: "center" }}>
                No conversations yet. Discover profiles and start chatting!
              </Text>
            </View>
          ) : (
            chats.map((c) => (
              <TouchableOpacity
                key={c.chat_id}
                testID={`chat-${c.other.id}`}
                onPress={() => router.push({ pathname: "/chat/[id]", params: { id: c.other.id, name: c.other.name } })}
                activeOpacity={0.85}
              >
                <Card style={{ padding: 0 }}>
                  <View style={{ flexDirection: "row", padding: 14, gap: 12, alignItems: "center" }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: theme.glass, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {c.other.photo ? <Image source={{ uri: c.other.photo }} style={{ width: "100%", height: "100%" }} /> : <Ionicons name="person" size={22} color={theme.textFaint} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: theme.text, fontWeight: "800" }} numberOfLines={1}>{c.other.name}</Text>
                        <Text style={{ color: theme.textFaint, fontSize: 11 }}>{new Date(c.last_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{c.last_message}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
