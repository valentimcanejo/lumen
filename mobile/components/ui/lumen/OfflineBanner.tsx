import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";

export function OfflineBanner() {
  const isConnected = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);

  useEffect(() => {
    translateY.value = withTiming(isConnected ? -80 : 0, { duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[s.banner, style, { paddingTop: insets.top + 8 }]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#0B0F14" />
      <Animated.Text style={s.text}>Sem conexão com a internet</Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#E26D6D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 10,
  },
  text: {
    color: "#0B0F14",
    fontSize: 13,
    fontWeight: "600",
  },
});
