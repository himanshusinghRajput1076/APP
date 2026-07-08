/**
 * Achievement badge chip.
 */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";

export type AchievementItem = {
  key: string;
  name: string;
  desc: string;
  icon: string;
  color: "primary" | "secondary";
  unlocked: boolean;
};

export function AchievementBadge({ item, onPress, size = "md" }: { item: AchievementItem; onPress?: () => void; size?: "sm" | "md" }) {
  const { theme } = useTheme();
  const c = item.color === "secondary" ? theme.secondary : theme.primary;
  const dim = size === "sm" ? 44 : 60;
  return (
    <TouchableOpacity
      testID={`achievement-${item.key}`}
      onPress={onPress}
      activeOpacity={0.85}
      style={{ alignItems: "center", width: dim + 32, opacity: item.unlocked ? 1 : 0.35 }}
    >
      <View style={{
        width: dim, height: dim, borderRadius: dim / 2,
        borderWidth: 1.5, borderColor: item.unlocked ? c : theme.border,
        backgroundColor: item.unlocked ? `${c}22` : theme.glass,
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={item.icon as any} size={dim / 2.4} color={item.unlocked ? c : theme.textFaint} />
        {!item.unlocked ? (
          <View style={{ position: "absolute", right: -2, bottom: -2, backgroundColor: theme.bg, borderRadius: 8, padding: 2 }}>
            <Ionicons name="lock-closed" size={9} color={theme.textFaint} />
          </View>
        ) : null}
      </View>
      <Text style={{ color: item.unlocked ? theme.text : theme.textMuted, fontSize: 10, fontWeight: "700", marginTop: 4, textAlign: "center" }} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}
