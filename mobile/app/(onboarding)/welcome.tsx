import React from "react";
import { ImageBackground } from "react-native";
import { Box } from "../../components/ui/box";
import { Center } from "../../components/ui/center";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { router } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";

export default function Welcome() {
  return (
    <ImageBackground
      source={require("../../assets/images/lumen_welcome_bg.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <Box className="flex-1 bg-black/55">
        <Center className="flex-1 px-6">
          <VStack className="w-full max-w-[420px] items-center" space="md">
            <Text className="text-[#E6EAF2] text-[36px] font-bold">Lumen</Text>

            <VStack className="items-center" space="xs">
              <Text className="text-[#E6EAF2] text-[28px] font-semibold text-center">
                Sua sessão em hoje
              </Text>
              <Text className="text-[#AAB0C0] text-[14px] text-center">
                Clareza em 5 minutos por dia
              </Text>
            </VStack>

            <Box className="w-full mt-4">
              <LumenButton
                onPress={() => router.push("/(onboarding)/language")}
              >
                Iniciar
              </LumenButton>
            </Box>

            <Box className="w-full">
              <LumenButton
                variant="ghost"
                onPress={() => router.replace("/(tabs)/home")}
              >
                Pular (demo)
              </LumenButton>
            </Box>
          </VStack>
        </Center>
      </Box>
    </ImageBackground>
  );
}
