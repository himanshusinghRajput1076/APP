import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor: mode === "dark" ? "rgba(5,5,5,0.85)" : "rgba(255,255,255,0.9)",
          borderTopColor: theme.border,
          borderTopWidth: 1,
        },
        tabBarBackground: () => (
          <BlurView
            tint={mode === "dark" ? "dark" : "light"}
            intensity={40}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "search" : "search-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pitch"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "rocket" : "rocket-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "chatbubbles" : "chatbubbles-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person-circle" : "person-circle-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 40 }}>
      <Ionicons name={name} size={24} color={color} />
      {focused ? (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, marginTop: 4 }} />
      ) : (
        <View style={{ height: 8 }} />
      )}
    </View>
  );
}
