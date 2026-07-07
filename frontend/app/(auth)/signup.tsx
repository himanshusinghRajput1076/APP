/**
 * Signup screen.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Btn, Input } from "@/src/components/ui";
import { spacing, typography } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";

export default function Signup() {
  const { theme } = useTheme();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email || !password || !name) { setError("Please fill all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const user = await signUp({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        role: (role as any) || "student",
      });
      // Redirect to KYC for new users
      router.replace("/(auth)/kyc");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role === "student" ? "FUTURE FOUNDER" : role === "investor" ? "FUTURE PARTNER" : "GROWING STARTUP";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>STEP 02 OF 03</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>{roleLabel}</Text>
          <Text style={{ ...typography.h1, color: theme.text, marginTop: 6 }}>Create your account</Text>
          <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 6 }}>
            Get 24 hours of free trial access. Complete KYC to unlock everything.
          </Text>

          <View style={{ marginTop: 32, gap: 18 }}>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Aarav Sharma" testID="signup-name" autoCapitalize="words" />
            <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" testID="signup-email" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry testID="signup-password" />
          </View>

          {error ? <Text style={{ color: theme.error, marginTop: 16 }}>{error}</Text> : null}

          <View style={{ marginTop: 32, gap: 12 }}>
            <Btn testID="signup-submit-btn" title="Create Account" onPress={submit} loading={loading} />
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} testID="go-login-btn">
              <Text style={{ color: theme.textMuted, textAlign: "center" }}>
                Already have an account? <Text style={{ color: theme.primary, fontWeight: "700" }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
