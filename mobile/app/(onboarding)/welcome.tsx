import React from "react";
import { ImageBackground, StyleSheet, View as RNView } from "react-native";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { HStack } from "../../components/ui/hstack";
import { router } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VALUE_PROPS = [
  { emoji: "🧠", key: "prop_1" },
  { emoji: "🔥", key: "prop_2" },
  { emoji: "✨", key: "prop_3" },
] as const;

const wl = StyleSheet.create({
  brandPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245,199,122,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,199,122,0.35)",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  brandText: {
    color: "#F5C77A",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  propsCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 4,
  },
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  propDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 16,
  },
  propEmojiBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  propEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  propLabel: {
    color: "#C8CDD8",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});

export default function Welcome() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("../../assets/images/lumen_welcome_bg.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <Box className="flex-1 bg-black/65">
        <Box
          className="flex-1 px-7 justify-end"
          style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        >
          <VStack space="lg">
            {/* Brand pill */}
            <RNView style={wl.brandPill}>
              <Text style={wl.brandText}>Lumen</Text>
            </RNView>

            {/* Headline */}
            <Text className="text-[#E6EAF2] text-[34px] font-bold leading-[42px]">
              {t("onboarding.welcome.headline")}
            </Text>

            {/* Tagline */}
            <Text className="text-[#AAB0C0] text-[15px] leading-[23px]">
              {t("onboarding.welcome.tagline")}
            </Text>

            {/* Value props */}
            <RNView style={wl.propsCard}>
              {VALUE_PROPS.map(({ emoji, key }, i) => (
                <RNView key={key}>
                  {i > 0 && <RNView style={wl.propDivider} />}
                  <RNView style={wl.propRow}>
                    <RNView style={wl.propEmojiBadge}>
                      <Text style={wl.propEmoji}>{emoji}</Text>
                    </RNView>
                    <Text style={wl.propLabel}>
                      {t(`onboarding.welcome.${key}`)}
                    </Text>
                  </RNView>
                </RNView>
              ))}
            </RNView>

            {/* CTAs */}
            <VStack space="sm" className="mt-2">
              <LumenButton onPress={() => router.push("/(onboarding)/goals")}>
                {t("onboarding.welcome.start")}
              </LumenButton>
            </VStack>
          </VStack>
        </Box>
      </Box>
    </ImageBackground>
  );
}
