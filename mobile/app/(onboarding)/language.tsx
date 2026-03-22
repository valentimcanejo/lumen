import React, { useState } from "react";
import { Box } from "../../components/ui/box";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { HStack } from "../../components/ui/hstack";

import { router } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { LumenCard } from "../../components/ui/lumen/Card";
import { Pressable } from "../../components/ui/pressable";
import { useTranslation } from "react-i18next";
import { ensureAnonymousAuth } from "../../services/auth.service";
import { setLanguage } from "../../i18n/setLanguage";

const LANGS = [
  { key: "pt", label: "Português", flag: "🇧🇷" },
  { key: "en", label: "English", flag: "🇺🇸" },
  { key: "es", label: "Español", flag: "🇪🇸" },
] as const;

export default function Language() {
  const [lang, setLang] = useState<(typeof LANGS)[number]["key"]>("pt");
  const { t } = useTranslation();

  const handleNext = async () => {
    try {
      await setLanguage(lang);
      const userCredentials = await ensureAnonymousAuth();

      router.push({
        pathname: `/(onboarding)/goals`,
        params: { selectedLanguage: lang, userId: userCredentials.uid },
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <Text className="text-[#E6EAF2] text-[26px] font-semibold">
        {t("onboarding.language.title")}
      </Text>
      <Text className="text-[#AAB0C0] mt-2">
        {t("onboarding.language.subtitle")}
      </Text>

      <VStack className="mt-6" space="md">
        {LANGS.map((l) => {
          const active = l.key === lang;
          return (
            <Pressable key={l.key} onPress={() => setLang(l.key)}>
              <LumenCard>
                <HStack className="items-center justify-between">
                  <HStack className="items-center" space="md">
                    <Text className="text-[18px]">{l.flag}</Text>
                    <Text className="text-[#E6EAF2] text-[16px] font-medium">
                      {l.label}
                    </Text>
                  </HStack>
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
        <LumenButton onPress={handleNext}>
          {t("onboarding.language.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
