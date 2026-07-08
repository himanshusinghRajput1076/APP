/**
 * Onboarding carousel — 3 slides explaining IDEACON value for each role.
 * Shown on very first launch only.
 */
import React, { useState, useRef } from "react";
import { View, Text, Dimensions, ScrollView, TouchableOpacity, StyleSheet, Image, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/theme/ThemeProvider";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "@/src/utils/storage";

const { width, height } = Dimensions.get("window");
const ONBOARDING_KEY = "ideacon.onboarded";

type Slide = {
  role: string;
  headline: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  image: string;
  accent: "primary" | "secondary";
};

const slides: Slide[] = [
  {
    role: "FUTURE FOUNDERS",
    headline: "Pitch your idea to India's top investors.",
    desc: "Students & aspiring entrepreneurs — get your first check from verified angels. 24-hour free trial. No pitch deck required.",
    icon: "school",
    image: "https://images.unsplash.com/photo-1526289034009-0240ddb68ce3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmdXR1cmlzdGljJTIwYWJzdHJhY3QlMjBkYXJrJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc4MzQzMDQyM3ww&ixlib=rb-4.1.0&q=85",
    accent: "primary",
  },
  {
    role: "FUTURE PARTNERS",
    headline: "Discover the next unicorn founders.",
    desc: "Investors — filter by sector, browse curated pitch decks, gift Ignite tokens to hot ideas, and message founders privately in-app.",
    icon: "briefcase",
    image: "https://images.unsplash.com/photo-1665686310934-8ee29fea6bcd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBmdXR1cmlzdGljJTIwYWJzdHJhY3QlMjBkYXJrJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc4MzQzMDQyM3ww&ixlib=rb-4.1.0&q=85",
    accent: "secondary",
  },
  {
    role: "GROWING STARTUPS",
    headline: "Scale beyond your first ₹1 Cr.",
    desc: "Registered startups — grab Series-Angel to Series-A capital, compliance help, and end-to-end fundraising services from the IDEACON team.",
    icon: "rocket",
    image: "https://images.unsplash.com/photo-1710188389311-91a72ecd6cec?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBmdXR1cmlzdGljJTIwYWJzdHJhY3QlMjBkYXJrJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc4MzQzMDQyM3ww&ixlib=rb-4.1.0&q=85",
    accent: "primary",
  },
];

export default function Onboarding() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const done = async () => {
    await storage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(auth)/welcome");
  };

  const next = () => {
    if (index < slides.length - 1) {
      const n = index + 1;
      setIndex(n);
      scrollRef.current?.scrollTo({ x: n * width, animated: true });
    } else {
      done();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} testID="onboarding-screen">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 24, height: 24, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#050505", fontWeight: "900", fontSize: 12 }}>I</Text>
            </View>
            <Text style={{ color: theme.text, fontWeight: "900", letterSpacing: 3 }}>IDEACON</Text>
          </View>
          <TouchableOpacity testID="skip-onboarding" onPress={done}>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>SKIP</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {slides.map((s, i) => {
            const c = s.accent === "primary" ? theme.primary : theme.secondary;
            return (
              <View key={i} style={{ width, flex: 1, paddingHorizontal: spacing.lg }}>
                {/* Image with gradient */}
                <View style={{ height: height * 0.42, marginTop: 10, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.border }}>
                  <Image source={{ uri: s.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <LinearGradient
                    colors={["transparent", `${theme.bg}CC`, theme.bg]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={{ position: "absolute", top: 20, left: 20 }}>
                    <View style={{ width: 46, height: 46, borderWidth: 1, borderColor: c, backgroundColor: `${c}22`, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={s.icon} size={22} color={c} />
                    </View>
                  </View>
                  <View style={{ position: "absolute", bottom: 16, left: 20, right: 20 }}>
                    <Text style={{ color: c, fontSize: 10, letterSpacing: 3, fontWeight: "800" }}>{s.role}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 28 }}>
                  <Text style={{ ...typography.h1, color: theme.text, fontSize: 30 }}>{s.headline}</Text>
                  <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 12 }}>{s.desc}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ padding: spacing.lg, gap: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  width: index === i ? 24 : 6,
                  height: 6, borderRadius: 3,
                  backgroundColor: index === i ? theme.primary : theme.border,
                }}
              />
            ))}
          </View>
          <Btn
            testID={index === slides.length - 1 ? "onboarding-done" : "onboarding-next"}
            title={index === slides.length - 1 ? "Get Started" : "Next"}
            onPress={next}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

export { ONBOARDING_KEY };
