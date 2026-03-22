import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

function SkeletonBox({
  width,
  height,
  radius = 8,
  opacity,
}: {
  width: number | string;
  height: number;
  radius?: number;
  opacity: Animated.SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius: radius, backgroundColor: "#1A2233" },
        animStyle,
      ]}
    />
  );
}

function usePulse() {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return opacity;
}

export function SkeletonCard() {
  const opacity = usePulse();
  return (
    <View style={s.card}>
      <SkeletonBox width="70%" height={18} radius={6} opacity={opacity} />
      <View style={{ height: 10 }} />
      <SkeletonBox width="90%" height={13} radius={6} opacity={opacity} />
      <View style={{ height: 6 }} />
      <SkeletonBox width="60%" height={13} radius={6} opacity={opacity} />
      <View style={{ height: 20 }} />
      <SkeletonBox width="100%" height={46} radius={14} opacity={opacity} />
    </View>
  );
}

export function SkeletonTrackCard() {
  const opacity = usePulse();
  return (
    <View style={s.card}>
      <View style={s.row}>
        <SkeletonBox width={40} height={40} radius={20} opacity={opacity} />
        <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
          <SkeletonBox width="60%" height={16} radius={6} opacity={opacity} />
          <SkeletonBox width="80%" height={12} radius={6} opacity={opacity} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonLessonRow() {
  const opacity = usePulse();
  return (
    <View style={s.lessonRow}>
      <SkeletonBox width={36} height={36} radius={10} opacity={opacity} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <SkeletonBox width="65%" height={14} radius={6} opacity={opacity} />
        <SkeletonBox width="40%" height={11} radius={6} opacity={opacity} />
      </View>
      <SkeletonBox width={60} height={32} radius={10} opacity={opacity} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 22,
    padding: 20,
  },
  row: { flexDirection: "row", alignItems: "center" },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 16,
    padding: 14,
  },
});
