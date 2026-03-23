import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { HStack } from "../../components/ui/hstack";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { useTranslation } from "react-i18next";
import { useUser } from "../../hooks/useUser";
import { Lang } from "../../models/lang";

const OPTIONS = [
  { key: 5, label: "5 min", desc: "onboarding.daily-time.desc_5" },
  { key: 10, label: "10 min", desc: "onboarding.daily-time.desc_10" },
  { key: 15, label: "15 min", desc: "onboarding.daily-time.desc_15" },
] as const;

export default function DailyTime() {
  const [minutes, setMinutes] = useState<number>(10);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setUserPreferences } = useUser();

  const { selectedLanguage, selectedTracks, userId } =
    useLocalSearchParams() as {
      selectedLanguage: Lang;
      selectedTracks: string;
      userId: string;
    };

  const handleNext = async () => {
    try {
      await setUserPreferences({
        userId: userId as string,
        lang: selectedLanguage as Lang,
        minutes,
        selectedTrackIds: selectedTracks?.split(",") || [],
      });

      router.push({
        pathname: `/(onboarding)/notifications`,
        params: { selectedLanguage, selectedMinutes: minutes, selectedTracks, userId },
      });
    } catch (error) {
      console.log(error);
    }
  };

  const selected = OPTIONS.find((o) => o.key === minutes)!;

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <Text className="text-[#E6EAF2] text-[26px] font-semibold">
        {t("onboarding.daily-time.title")}
      </Text>
      <Text className="text-[#AAB0C0] mt-2">
        {t("onboarding.daily-time.subtitle")}
      </Text>

      {/* Pill selector */}
      <HStack className="mt-8 bg-[#111827] rounded-2xl p-1" space="xs">
        {OPTIONS.map((o) => {
          const active = o.key === minutes;
          return (
            <Pressable
              key={o.key}
              onPress={() => setMinutes(o.key)}
              style={{ flex: 1 }}
            >
              <Box
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: active ? "#F5C77A" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: active ? "#0B0F14" : "#AAB0C0",
                    fontSize: 15,
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {o.label}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </HStack>

      {/* Description card */}
      <Box
        className="mt-6 bg-[#111827] rounded-2xl p-5"
        style={{ borderWidth: 1, borderColor: "#F5C77A33" }}
      >
        <Text className="text-[#F5C77A] text-[13px] font-semibold mb-1">
          {selected.label} {t("onboarding.daily-time.per_day")}
        </Text>
        <Text className="text-[#AAB0C0] text-[14px] leading-5">
          {t(selected.desc)}
        </Text>
      </Box>

      <Box className="mt-auto" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <LumenButton onPress={handleNext}>
          {t("onboarding.daily-time.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
