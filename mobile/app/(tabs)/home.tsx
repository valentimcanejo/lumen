import React from "react";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { LumenCard } from "../../components/ui/lumen/Card";
import { LumenButton } from "../../components/ui/lumen/Button";
import { Chip } from "../../components/ui/lumen/Chip";
import { Pill } from "../../components/ui/lumen/Pill";
import { Redirect } from "expo-router";

export default function Home() {
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
        Sua sessão de hoje
      </Text>

      <HStack className="mt-3" space="sm">
        <Pill icon="🔥" text="Streak: 7" />
        <Pill icon="⏱" text="8 min" />
        <Pill icon="🌍" text="PT" />
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
                <LumenButton onPress={() => {}}>Iniciar</LumenButton>
              </Box>
              <Box className="flex-1">
                <LumenButton variant="ghost" onPress={() => {}}>
                  Ver trilha
                </LumenButton>
              </Box>
            </HStack>
          </VStack>
        </LumenCard>
      </Box>

      <Box className="mt-6">
        <Text className="text-[#E6EAF2] text-[16px] font-semibold">
          Esta semana
        </Text>
        <Text className="text-[#AAB0C0] mt-2">32 min estudados</Text>
      </Box>
    </Box>
  );
}
