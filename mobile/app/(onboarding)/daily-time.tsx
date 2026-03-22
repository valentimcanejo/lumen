import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { LumenCard } from "../../components/ui/lumen/Card";
import { useTranslation } from "react-i18next";
import { useUser } from "../../hooks/useUser";
import { Lang } from "../../models/lang";

const OPTIONS = [
  { key: 5, label: "5 min" },
  { key: 10, label: "10 min" },
  { key: 15, label: "15 min" },
] as const;

export default function DailyTime() {
  const [minutes, setMinutes] = useState<number>(10);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setUserPreferences } = useUser();

  const { selectedLanguage, selectedGoals, userId } =
    useLocalSearchParams() as {
      selectedLanguage: Lang;
      selectedGoals: string;
      userId: string;
    };

  const handleNext = async () => {
    try {
      await setUserPreferences({
        userId: userId as string,
        lang: selectedLanguage as Lang,
        minutes,
        selectedGoalIds: selectedGoals?.split(",") || [],
      });

      router.push({
        pathname: `/(onboarding)/notifications`,
        params: { selectedLanguage, selectedMinutes: minutes, selectedGoals, userId },
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <Text className="text-[#E6EAF2] text-[26px] font-semibold">
        {t("onboarding.daily-time.title")}
      </Text>
      <Text className="text-[#AAB0C0] mt-2">
        {t("onboarding.daily-time.subtitle")}
      </Text>

      <VStack className="mt-6" space="md">
        {OPTIONS.map((o) => {
          const active = o.key === minutes;
          return (
            <Pressable key={o.key} onPress={() => setMinutes(o.key)}>
              <LumenCard className={active ? "border-[#F5C77A]/40" : undefined}>
                <Box
                  className={
                    active
                      ? "bg-[#F5C77A] rounded-2xl px-4 py-4"
                      : "bg-transparent rounded-2xl px-4 py-4"
                  }
                >
                  <Text
                    className={
                      active
                        ? "text-[#0B0F14] text-[18px] font-semibold"
                        : "text-[#E6EAF2] text-[18px] font-semibold"
                    }
                  >
                    {o.label}
                  </Text>
                </Box>
              </LumenCard>
            </Pressable>
          );
        })}
      </VStack>

      <Box className="mt-auto" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <LumenButton onPress={handleNext}>
          {t("onboarding.daily-time.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
