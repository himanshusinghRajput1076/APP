/**
 * KYC screen - mandatory verification (PAN, Aadhar, Mobile, ID photo).
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Btn, Input, Card, Badge } from "@/src/components/ui";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";

async function pickImageBase64(): Promise<string | null> {
  // Uses expo-image-picker if available, else fallback prompt.
  try {
    const ImagePicker = await import("expo-image-picker");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return null;
    return `data:image/jpeg;base64,${result.assets[0].base64}`;
  } catch {
    return null;
  }
}

type IdType = "college" | "school";

export default function KYCScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [pan, setPan] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [mobile, setMobile] = useState("");
  const [idType, setIdType] = useState<IdType>("college");
  const [idNumber, setIdNumber] = useState("");
  const [instName, setInstName] = useState("");
  const [address, setAddress] = useState("");
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDigilocker, setUseDigilocker] = useState(false);

  const isRequired = user?.role === "student";

  const submit = async () => {
    setError(null);
    if (!pan || !aadhar || !mobile || !idPhoto) {
      setError("Please fill all required fields (marked with *) and upload ID photo");
      return;
    }
    if (pan.length !== 10) { setError("PAN must be 10 characters"); return; }
    if (aadhar.replace(/\s/g, "").length !== 12) { setError("Aadhar must be 12 digits"); return; }
    if (mobile.length < 10) { setError("Enter a valid mobile number"); return; }

    setLoading(true);
    try {
      await api.post("/kyc/submit", {
        pan: pan.toUpperCase(),
        aadhar,
        mobile,
        id_photo: idPhoto,
        id_card_type: idType,
        id_card_number: idNumber || undefined,
        college_or_school_name: instName || undefined,
        address: address || undefined,
      });
      await refresh();
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "KYC submission failed");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => router.replace("/(tabs)/home");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
              <Ionicons name="chevron-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>STEP 03 OF 03</Text>
          </View>
          {!isRequired ? (
            <TouchableOpacity testID="skip-kyc-btn" onPress={skip}>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>SKIP FOR NOW</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="shield-checkmark" size={18} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>VERIFICATION · SECURE</Text>
          </View>
          <Text style={{ ...typography.h1, color: theme.text }}>KYC Verification</Text>
          <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 6 }}>
            Fields marked with <Text style={{ color: theme.error }}>*</Text> are mandatory for account security & compliance.
          </Text>

          <Card style={{ marginTop: 20, borderColor: theme.primary, backgroundColor: theme.primaryDim }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }}>DigiLocker KYC (Recommended)</Text>
                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>
                  Instant government-verified KYC via DigiLocker. Coming soon.
                </Text>
              </View>
              <TouchableOpacity
                testID="digilocker-toggle"
                onPress={() => setUseDigilocker(!useDigilocker)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  backgroundColor: useDigilocker ? theme.primary : theme.border,
                  padding: 2, justifyContent: "center",
                }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: theme.text,
                  alignSelf: useDigilocker ? "flex-end" : "flex-start",
                }} />
              </TouchableOpacity>
            </View>
            {useDigilocker ? (
              <View style={{ marginTop: 12 }}>
                <Badge text="AVAILABLE POST-DEPLOYMENT" color={theme.warning} />
                <Text style={{ color: theme.textMuted, marginTop: 8, fontSize: 12 }}>
                  DigiLocker integration requires official partnership approval. For now, please continue with manual KYC below.
                </Text>
              </View>
            ) : null}
          </Card>

          <View style={{ marginTop: 24, gap: 16 }}>
            <Input label="PAN Number *" value={pan} onChangeText={(v) => setPan(v.toUpperCase())} placeholder="ABCDE1234F" testID="kyc-pan" autoCapitalize="characters" maxLength={10} />
            <Input label="Aadhar Number *" value={aadhar} onChangeText={setAadhar} placeholder="XXXX XXXX XXXX" testID="kyc-aadhar" keyboardType="number-pad" maxLength={14} />
            <Input label="Mobile Number *" value={mobile} onChangeText={setMobile} placeholder="10-digit number" testID="kyc-mobile" keyboardType="phone-pad" maxLength={10} />

            <View style={{ gap: 6 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>ID CARD TYPE *</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["college", "school"] as IdType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    testID={`id-type-${t}`}
                    onPress={() => setIdType(t)}
                    style={{
                      flex: 1, padding: 12, borderRadius: radius.sm, borderWidth: 1,
                      borderColor: idType === t ? theme.primary : theme.border,
                      backgroundColor: idType === t ? theme.primaryDim : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: idType === t ? theme.primary : theme.textMuted, fontWeight: "700", fontSize: 13 }}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input label="Institution Name" value={instName} onChangeText={setInstName} placeholder="e.g., IIT Bombay" testID="kyc-institution" />
            <Input label="ID Card Number" value={idNumber} onChangeText={setIdNumber} placeholder="Roll number / ID number" testID="kyc-id-number" />
            <Input label="Address" value={address} onChangeText={setAddress} placeholder="Full address" testID="kyc-address" multiline numberOfLines={3} />

            <View style={{ gap: 6 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>ID CARD PHOTO *</Text>
              <TouchableOpacity
                testID="kyc-upload-photo"
                onPress={async () => {
                  const b = await pickImageBase64();
                  if (b) setIdPhoto(b);
                }}
                style={{
                  borderWidth: 1, borderStyle: "dashed", borderColor: theme.borderStrong,
                  borderRadius: radius.sm, padding: spacing.md, alignItems: "center",
                  backgroundColor: theme.glass,
                }}
              >
                {idPhoto ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: idPhoto }} style={{ width: 120, height: 80, borderRadius: 4 }} resizeMode="cover" />
                    <Text style={{ color: theme.primary, marginTop: 8, fontSize: 12, fontWeight: "700" }}>TAP TO REPLACE</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 12 }}>
                    <Ionicons name="cloud-upload-outline" size={30} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, marginTop: 6 }}>Upload ID card photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={{ color: theme.error, marginTop: 16 }} testID="kyc-error">{error}</Text> : null}

          <View style={{ marginTop: 24 }}>
            <Btn testID="kyc-submit-btn" title="Submit for Verification" onPress={submit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
