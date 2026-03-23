import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { useTranslation } from "react-i18next";
import { Lang } from "../../models/lang";
import { getActiveGoals, type Goal } from "../../repositories/goals.repo";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  brain: "bulb-outline",
  globe: "globe-outline",
  chart: "bar-chart-outline",
};

export default function Goals() {
  const insets = useSafeAreaInsets();
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
      params: { selectedLanguage, selectedTracks: selected.join(","), userId },
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
          const color = g.color ?? "#AAB0C0";
          const iconName = ICON_MAP[g.icon] ?? "ellipse-outline";

          return (
            <Pressable key={g.id} onPress={() => toggle(g.id)}>
              <Box
                style={{
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: active ? color : "#1A2233",
                  backgroundColor: active ? `${color}12` : "#111827",
                  padding: 16,
                }}
              >
                <HStack className="items-center" style={{ gap: 14 }}>
                  {/* Icon circle */}
                  <Box
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: `${color}20`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={iconName} size={22} color={color} />
                  </Box>

                  {/* Text */}
                  <VStack style={{ flex: 1 }} space="xs">
                    <Text className="text-[#E6EAF2] text-[16px] font-semibold">
                      {g.title[selectedLanguage as Lang]}
                    </Text>
                    {g.description?.[selectedLanguage as Lang] && (
                      <Text className="text-[#7B8193] text-[13px]" numberOfLines={2}>
                        {g.description[selectedLanguage as Lang]}
                      </Text>
                    )}
                  </VStack>

                  {/* Checkmark */}
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? color : "#2A2F3E",
                      backgroundColor: active ? color : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && (
                      <Ionicons name="checkmark" size={14} color="#0B0F14" />
                    )}
                  </Box>
                </HStack>
              </Box>
            </Pressable>
          );
        })}
      </VStack>

      <Box className="mt-auto" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <Text className="text-[#7B8193] text-[12px] text-center mb-3">
          {t("onboarding.goals.hint")}
        </Text>
        <LumenButton disabled={!canContinue} onPress={handleNext}>
          {t("onboarding.goals.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
