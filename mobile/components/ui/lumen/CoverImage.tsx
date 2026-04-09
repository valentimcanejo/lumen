import React, { useEffect, useState } from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import type { LessonMeta } from "../../../repositories/lessons.repo";

type Props = {
  uri: string;
  credit?: LessonMeta["coverImageCredit"];
  width: number | string;
  height: number;
  borderRadius?: number;
};

export function CoverImage({ uri, credit, width, height, borderRadius = 0 }: Props) {
  const [loaded, setLoaded] = useState(false);

  // Skeleton pulse
  const skeletonOpacity = useSharedValue(0.35);
  useEffect(() => {
    skeletonOpacity.value = withRepeat(
      withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Image fade-in
  const imageOpacity = useSharedValue(0);
  const imageStyle = useAnimatedStyle(() => ({ opacity: imageOpacity.value }));
  const skeletonStyle = useAnimatedStyle(() => ({ opacity: loaded ? 0 : skeletonOpacity.value }));

  function handleLoad() {
    setLoaded(true);
    imageOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
  }

  return (
    <View style={{ width: width as number, height, borderRadius, overflow: "hidden" }}>
      {/* Skeleton — visible while loading */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#1A2233" }, skeletonStyle]}
      />

      {/* Image — fades in on load */}
      <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onLoad={handleLoad}
        />
      </Animated.View>

      {/* Attribution — Unsplash API Terms §9 */}
      {credit && loaded && (
        <View style={s.credit}>
          <Text style={s.creditText}>
            <Text
              style={s.creditLink}
              onPress={() => Linking.openURL(credit.profileUrl + "?utm_source=lumen_app&utm_medium=referral")}
            >
              {credit.photographer}
            </Text>
            {" / "}
            <Text
              style={s.creditLink}
              onPress={() => Linking.openURL("https://unsplash.com/?utm_source=lumen_app&utm_medium=referral")}
            >
              Unsplash
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  credit: {
    position: "absolute",
    bottom: 6,
    right: 8,
  },
  creditText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
  },
  creditLink: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    textDecorationLine: "underline",
  },
});
