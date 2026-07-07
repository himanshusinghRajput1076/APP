import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Btn, Input } from "@/src/components/ui";
import { spacing, typography } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";

export default function Login() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email || !password) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      const user = await signIn(email.trim().toLowerCase(), password);
      if (user.role === "admin") router.replace("/admin");
      else router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>WELCOME BACK</Text>
          <Text style={{ ...typography.h1, color: theme.text, marginTop: 6 }}>Sign in to IDEACON</Text>
          <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 6 }}>
            Continue building your startup journey.
          </Text>

          <View style={{ marginTop: 32, gap: 18 }}>
            <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" testID="login-email" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry testID="login-password" />
          </View>

          {error ? <Text style={{ color: theme.error, marginTop: 16 }} testID="login-error">{error}</Text> : null}

          <View style={{ marginTop: 32, gap: 12 }}>
            <Btn testID="login-submit-btn" title="Sign In" onPress={submit} loading={loading} />
            <TouchableOpacity onPress={() => router.replace("/(auth)/role")} testID="go-signup-btn">
              <Text style={{ color: theme.textMuted, textAlign: "center" }}>
                New to IDEACON? <Text style={{ color: theme.primary, fontWeight: "700" }}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
