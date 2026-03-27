import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Lang } from "../../models/lang";

export default function SocialProof() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pressedReady, setPressedReady] = useState(false);
  const [pressedCurious, setPressedCurious] = useState(false);
  const { selectedLanguage, selectedTracks, userId } =
    useLocalSearchParams() as {
      selectedLanguage: Lang;
      selectedTracks: string;
      userId: string;
    };

  const handleNext = () =>
    router.push({
      pathname: `/(onboarding)/daily-time`,
      params: { selectedLanguage, selectedTracks, userId },
    });

  return (
    <Box
      className="flex-1 bg-[#0B0F14] px-6"
      style={{ paddingTop: insets.top + 48, paddingBottom: Math.max(insets.bottom, 32) }}
    >
      {/* Stat */}
      <Text
        style={{
          color: "#F5C77A",
          fontSize: 32,
          fontWeight: "800",
          lineHeight: 42,
        }}
      >
        {t("onboarding.social-proof.stat")}
      </Text>

      {/* Question */}
      <Text
        style={{
          color: "#AAB0C0",
          fontSize: 17,
          marginTop: 16,
        }}
      >
        {t("onboarding.social-proof.question")}
      </Text>

      {/* CTAs */}
      <Box style={{ marginTop: "auto", gap: 12 }}>
        <Pressable
          onPress={handleNext}
          onPressIn={() => setPressedReady(true)}
          onPressOut={() => setPressedReady(false)}
        >
          <Box
            style={{
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 16,
              backgroundColor: pressedReady ? "#E0B560" : "#F5C77A",
              alignItems: "center",
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>👍</Text>
            <Text style={{ color: "#0B0F14", fontSize: 16, fontWeight: "700" }}>
              {t("onboarding.social-proof.cta_ready")}
            </Text>
          </Box>
        </Pressable>

        <Pressable
          onPress={handleNext}
          onPressIn={() => setPressedCurious(true)}
          onPressOut={() => setPressedCurious(false)}
        >
          <Box
            style={{
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 16,
              backgroundColor: pressedCurious ? "#1C2030" : "#111827",
              alignItems: "center",
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>🤔</Text>
            <Text style={{ color: "#E6EAF2", fontSize: 16, fontWeight: "500" }}>
              {t("onboarding.social-proof.cta_curious")}
            </Text>
          </Box>
        </Pressable>
      </Box>
    </Box>
  );
}
