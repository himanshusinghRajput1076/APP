/**
 * Reusable UI primitives themed for IDEACON.
 */
import React from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, StyleProp } from "react-native";
import { useTheme } from "@/src/theme/ThemeProvider";
import { radius, spacing, typography } from "@/src/theme/tokens";

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { theme } = useTheme();
  return (
    <View
      testID={testID}
      style={[{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
      }, style]}
    >
      {children}
    </View>
  );
}

export function Btn({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  testID,
  style,
  small,
  iconLeft,
}: {
  title: string;
  onPress: (...args: any[]) => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  iconLeft?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  let bg = theme.primary;
  let color = theme.mode === "dark" ? "#050505" : "#FFFFFF";
  let borderColor: string = "transparent";
  let borderWidth = 0;

  if (variant === "secondary") { bg = theme.secondary; color = theme.mode === "dark" ? "#050505" : "#FFFFFF"; }
  if (variant === "outline") { bg = "transparent"; color = theme.text; borderColor = theme.borderStrong; borderWidth = 1; }
  if (variant === "ghost") { bg = "transparent"; color = theme.text; }
  if (variant === "danger") { bg = theme.error; color = "#FFFFFF"; }

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[{
        backgroundColor: bg,
        paddingVertical: small ? 10 : 14,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.sm,
        borderWidth,
        borderColor,
        opacity: isDisabled ? 0.5 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {iconLeft}
          <Text style={{ color, fontWeight: "700", fontSize: small ? 13 : 15, letterSpacing: 0.3 }}>{title.toUpperCase()}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Input({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, testID, multiline, numberOfLines, style, editable = true, maxLength,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  testID?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
  maxLength?: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={{ ...typography.caption, color: theme.textMuted }}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        maxLength={maxLength}
        style={{
          borderWidth: 1,
          borderColor: theme.borderStrong,
          borderRadius: radius.sm,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 12,
          color: theme.text,
          backgroundColor: theme.glass,
          fontSize: 15,
          minHeight: multiline ? 90 : 46,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
  color?: string;
}) {
  const { theme } = useTheme();
  const activeColor = color || theme.primary;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? activeColor : theme.border,
        backgroundColor: active ? `${activeColor}22` : "transparent",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ color: active ? activeColor : theme.textMuted, fontWeight: "600", fontSize: 12, letterSpacing: 0.3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Divider() {
  const { theme } = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border, marginVertical: spacing.md }} />;
}

export function Badge({ text, color, testID }: { text: string; color?: string; testID?: string }) {
  const { theme } = useTheme();
  const c = color || theme.primary;
  return (
    <View testID={testID} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, borderWidth: 1, borderColor: c, backgroundColor: `${c}22`, alignSelf: "flex-start" }}>
      <Text style={{ color: c, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>{text.toUpperCase()}</Text>
    </View>
  );
}

export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.lg }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.h1, color: theme.text }}>{title}</Text>
        {subtitle ? <Text style={{ ...typography.body, color: theme.textMuted, marginTop: 4 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
