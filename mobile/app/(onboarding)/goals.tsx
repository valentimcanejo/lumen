import React, { useEffect, useMemo, useState } from "react";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { LumenCard } from "../../components/ui/lumen/Card";
import { useTranslation } from "react-i18next";
import { Lang } from "../../models/lang";
import { getActiveGoals, type Goal } from "../../repositories/goals.repo";

export default function Goals() {
  const [selected, setSelected] = useState<string[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const canContinue = useMemo(
    () => selected.length >= 1 && selected.length <= 3,
    [selected],
  );
  const { t } = useTranslation();

  useEffect(() => {
    getActiveGoals().then(setGoals).catch(() => setGoals([]));
  }, []);

  const { selectedLanguage, userId } = useLocalSearchParams();

  function toggle(key: string) {
    setSelected((prev) => {
      const has = prev.includes(key);
      if (has) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  const handleNext = () =>
    router.push({
      pathname: `/(onboarding)/daily-time`,
      params: { selectedLanguage, selectedGoals: selected.join(","), userId },
    });

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <Text className="text-[#E6EAF2] text-[26px] font-semibold">
        {t("onboarding.goals.title")}
      </Text>
      <Text className="text-[#AAB0C0] mt-2">
        {t("onboarding.goals.subtitle")}
      </Text>

      <VStack className="mt-6" space="md">
        {goals.map((g) => {
          const active = selected.includes(g.id);
          return (
            <Pressable key={g.id} onPress={() => toggle(g.id)}>
              <LumenCard>
                <HStack className="items-center justify-between">
                  <Text className="text-[#E6EAF2] text-[16px] font-medium">
                    {g.title[selectedLanguage as Lang]}
                  </Text>
                  <Text
                    className={
                      active ? "text-[#F5C77A] text-[16px]" : "text-[#7B8193]"
                    }
                  >
                    {active ? "✓" : ""}
                  </Text>
                </HStack>
              </LumenCard>
            </Pressable>
          );
        })}
      </VStack>

      <Box className="pb-6 mt-auto">
        <LumenButton disabled={!canContinue} onPress={handleNext}>
          {t("onboarding.goals.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
