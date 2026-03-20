import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";

import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { setUserLanguage } from "../../repositories/user.repo";
import type { Lang } from "../../models/lang";

function StreakInfo({ streak }: { streak: number }) {
  return (
    <VStack className="items-center space-y-1">
      <Text className="text-[#E6EAF2] text-[16px] font-semibold">
        Streak Atual
      </Text>
      <Text className="text-[#F5C77A] text-[32px] font-semibold">
        {streak} dias
      </Text>
    </VStack>
  );
}

function DailyGoal({ goal }: { goal: number }) {
  return (
    <VStack className="items-center space-y-1">
      <Text className="text-[#E6EAF2] text-[16px] font-semibold">
        Meta diária
      </Text>
      <Text className="text-[#F5C77A] text-[32px] font-semibold">
        {goal} minutos
      </Text>
    </VStack>
  );
}

function LanguageSelector({
  lang,
  onChange,
}: {
  lang: string;
  onChange: (lang: string) => void;
}) {
  return (
    <HStack className="flex flex-col gap-2">
      <Pressable
        onPress={() => onChange("pt")}
        className="border border-[#AAB0C0] rounded-[16px] p-4"
      >
        <Text
          className={`text-[16px] ${lang === "pt" ? "text-[#F5C77A]" : "text-[#AAB0C0]"}`}
        >
          Português
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("en")}
        className="border border-[#AAB0C0] rounded-[16px] p-4"
      >
        <Text
          className={`text-[16px] ${lang === "en" ? "text-[#F5C77A]" : "text-[#AAB0C0]"}`}
        >
          English
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("es")}
        className="border border-[#AAB0C0] rounded-[16px] p-4"
      >
        <Text
          className={`text-[16px] ${lang === "es" ? "text-[#F5C77A]" : "text-[#AAB0C0]"}`}
        >
          Español
        </Text>
      </Pressable>
    </HStack>
  );
}

export default function ProfileScreen() {
  const { loading, getUserData } = useUser();
  const { uid } = useAuth();
  const [language, setLanguage] = useState<Lang>("pt");
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((user) => {
      if (!user) return;
      setLanguage(user.lang);
      setStreak(user.streak?.current ?? 0);
      setDailyGoal(user.dailyGoalMin ?? 10);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as Lang);
  };

  const handleSaveChanges = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await setUserLanguage(uid, language);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5 pt-14">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.push("/(tabs)/home")}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>
          <Text className="text-[#E6EAF2] text-[20px] font-semibold">
            Perfil
          </Text>
        </HStack>
      </Box>

      <Box className="flex-1 px-5 py-6">
        {loading ? (
          <Text className="text-[#AAB0C0]">Carregando dados do perfil...</Text>
        ) : (
          <>
            <Box className="mt-6">
              <StreakInfo streak={streak} />
            </Box>

            <Box className="mt-6">
              <DailyGoal goal={dailyGoal} />
            </Box>

            <Box className="mt-6">
              <Text className="text-[#E6EAF2] text-[16px] font-semibold">
                Idioma
              </Text>
              <LanguageSelector
                lang={language}
                onChange={handleLanguageChange}
              />
            </Box>

            <Box className="mt-6">
              <Pressable
                onPress={handleSaveChanges}
                className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
              >
                <Text className="text-[#0B0F14] text-[16px] font-semibold">
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Text>
              </Pressable>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
