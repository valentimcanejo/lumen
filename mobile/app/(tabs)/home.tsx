import React, { useEffect, useState } from "react";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { LumenCard } from "../../components/ui/lumen/Card";
import { LumenButton } from "../../components/ui/lumen/Button";
import { Chip } from "../../components/ui/lumen/Chip";
import { Pill } from "../../components/ui/lumen/Pill";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUser } from "../../hooks/useUser";
import { UserProfile } from "../../models/user";

export default function Home() {
  const { t } = useTranslation();
  const { selectedLanguage, selectedGoals, selectedMinutes, userId } =
    useLocalSearchParams();
  const { getUserData, loading } = useUser();
  const [user, setUser] = useState<UserProfile | null>(null);

  const userGoals = useEffect(() => {
    const fetchUserData = async () => {
      const userData = await getUserData({ userId: userId as string });
      setUser(userData || null);
    };

    fetchUserData();
  }, []);

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <HStack className="items-center justify-between">
        <Text className="text-[#E6EAF2] text-[22px] font-bold">Lumen</Text>
        <HStack space="md">
          <Text className="text-[#AAB0C0]">🔔</Text>
          <Text className="text-[#AAB0C0]">⚙️</Text>
        </HStack>
      </HStack>

      <Text className="text-[#E6EAF2] text-[22px] font-semibold mt-6">
        {t("tabs.home.title")}
      </Text>

      <HStack className="mt-3" space="sm">
        <Pill
          icon="🔥"
          text={`${t("tabs.home.streak")}: ${user?.streak?.current || 0}`}
        />
        {/* <Pill icon="⏱" text="8 min" /> */}
        <Pill icon="🌍" text={user?.lang || ""} />
      </HStack>

      <Box className="mt-5">
        <LumenCard>
          <VStack space="md">
            <Text className="text-[#E6EAF2] text-[20px] font-semibold">
              O Equilíbrio de Poder
            </Text>
            <Text className="text-[#AAB0C0]">Geopolítica • 8 min</Text>

            <HStack space="sm">
              <Chip label="Geopolítica" />
              <Chip label="Poder" />
            </HStack>

            <HStack className="mt-2" space="md">
              <Box className="flex-1">
                <LumenButton onPress={() => router.push("/(session)/lesson")}>
                  {t("tabs.home.start")}
                </LumenButton>
              </Box>
              <Box className="flex-1">
                <LumenButton
                  variant="ghost"
                  onPress={() => router.push("/(session)/lesson")}
                >
                  {t("tabs.home.seeTrail")}
                </LumenButton>
              </Box>
            </HStack>
          </VStack>
        </LumenCard>
      </Box>

      <Box className="mt-6">
        <Text className="text-[#E6EAF2] text-[16px] font-semibold">
          {t("tabs.home.thisWeek")}
        </Text>
        <Text className="text-[#AAB0C0] mt-2">
          32 min {t("tabs.home.studied")}
        </Text>
      </Box>
    </Box>
  );
}
