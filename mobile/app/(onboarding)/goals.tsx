import React, { useMemo, useState } from "react";
import { Box } from "../../components/ui/box";
import { Center } from "../../components/ui/center";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { Pressable } from "../../components/ui/pressable";
import { router } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { LumenCard } from "../../components/ui/lumen/Card";
import { useTranslation } from "react-i18next";

const GOALS = [
  { key: "repertorio", label: "Repertório geral" },
  { key: "critico", label: "Pensamento crítico" },
  { key: "mundo", label: "Entender o mundo" },
  { key: "ciencia", label: "Ciência & tecnologia" },
  { key: "comunicacao", label: "Comunicação" },
] as const;

export default function Goals() {
  const [selected, setSelected] = useState<string[]>(["repertorio", "critico"]);
  const canContinue = useMemo(
    () => selected.length >= 1 && selected.length <= 3,
    [selected],
  );
  const { t } = useTranslation();

  function toggle(key: string) {
    setSelected((prev) => {
      const has = prev.includes(key);
      if (has) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <Text className="text-[#E6EAF2] text-[26px] font-semibold">
        {t("onboarding.language.title")}
      </Text>
      <Text className="text-[#AAB0C0] mt-2">
        {t("onboarding.language.subtitle")}
      </Text>

      <VStack className="mt-6" space="md">
        {GOALS.map((g) => {
          const active = selected.includes(g.key);
          return (
            <Pressable key={g.key} onPress={() => toggle(g.key)}>
              <LumenCard>
                <HStack className="items-center justify-between">
                  <Text className="text-[#E6EAF2] text-[16px] font-medium">
                    {g.label}
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
        <LumenButton
          disabled={!canContinue}
          onPress={() => router.push("/(onboarding)/daily-time")}
        >
          {t("onboarding.language.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
