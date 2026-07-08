/**
 * Skeleton loader — shimmer animation for loading states.
 */
import React, { useEffect } from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from "react-native-reanimated";
import { useTheme } from "@/src/theme/ThemeProvider";

export function Skeleton({
  width,
  height,
  radius = 6,
  style,
  testID,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0.4, 1]);
    return { opacity };
  });

  return (
    <View testID={testID} style={[{ width, height, borderRadius: radius, backgroundColor: theme.glass, overflow: "hidden" }, style]}>
      <Animated.View style={[{ flex: 1, backgroundColor: theme.borderStrong }, animatedStyle]} />
    </View>
  );
}

export function SkeletonCard() {
  const { theme } = useTheme();
  return (
    <View style={{ padding: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 8, gap: 10 }}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={10} />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
        <Skeleton width={60} height={60} radius={30} />
        <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
          <Skeleton width="80%" height={12} />
          <Skeleton width="50%" height={10} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
