import React from "react";
import { ImageBackground } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export default function Welcome() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  async function handleSkip() {
    await AsyncStorage.setItem("hasOnboarded", "true");
    router.replace("/(tabs)/home");
  }

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
            {/* Brand */}
            <Text className="text-[#F5C77A] text-[13px] font-semibold tracking-widest uppercase">
              Lumen
            </Text>

            {/* Headline */}
            <Text className="text-[#E6EAF2] text-[32px] font-bold leading-[40px]">
              {t("onboarding.welcome.headline")}
            </Text>

            {/* Tagline */}
            <Text className="text-[#AAB0C0] text-[15px] leading-[22px]">
              {t("onboarding.welcome.tagline")}
            </Text>

            {/* Value props */}
            <VStack space="sm" className="mt-2">
              {VALUE_PROPS.map(({ emoji, key }) => (
                <HStack key={key} className="items-center" space="md">
                  <Box
                    className="w-[36px] h-[36px] rounded-[10px] items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  >
                    <Text className="text-[17px]">{emoji}</Text>
                  </Box>
                  <Text className="text-[#C8CDD8] text-[14px] flex-1">
                    {t(`onboarding.welcome.${key}`)}
                  </Text>
                </HStack>
              ))}
            </VStack>

            {/* CTAs */}
            <VStack space="sm" className="mt-4">
              <LumenButton onPress={() => router.push("/(onboarding)/language")}>
                {t("onboarding.welcome.start")}
              </LumenButton>
              <LumenButton variant="ghost" onPress={handleSkip}>
                {t("onboarding.welcome.skip")}
              </LumenButton>
            </VStack>
          </VStack>
        </Box>
      </Box>
    </ImageBackground>
  );
}
