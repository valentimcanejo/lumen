import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";

import { useUser } from "../../hooks/useUser";
// import { setSavedLanguage } from "@/src/i18n/lang.storage"; // mudar idioma

// --- Componente: Streak
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

// --- Componente: Meta diária
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

// --- Componente: Botões de idioma ---
function LanguageSelector({
  lang,
  onChange,
}: {
  lang: string;
  onChange: (lang: string) => void;
}) {
  return (
    <HStack className="space-x-3">
      <Pressable onPress={() => onChange("pt")}>
        <Text
          className={`text-[16px] ${lang === "pt" ? "text-[#F5C77A]" : "text-[#AAB0C0]"}`}
        >
          Português
        </Text>
      </Pressable>
      <Pressable onPress={() => onChange("en")}>
        <Text
          className={`text-[16px] ${lang === "en" ? "text-[#F5C77A]" : "text-[#AAB0C0]"}`}
        >
          English
        </Text>
      </Pressable>
      <Pressable onPress={() => onChange("es")}>
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
  const { loading } = useUser();
  const user = {
    lang: "pt",
    streak: { current: 0, best: 0, shields: 0, lastStudyDate: null },
    dailyGoalMin: 10,
  };
  const [language, setLanguage] = useState(user?.lang ?? "pt");
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(user?.streak?.current ?? 0);
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoalMin ?? 10); // Default 10min

  useEffect(() => {
    if (user) {
      setLanguage(user.lang);
      setStreak(user.streak?.current ?? 0);
      setDailyGoal(user.dailyGoalMin ?? 10);
    }
  }, [user]);

  const handleLanguageChange = async (newLang: string) => {
    setSaving(true);
    //await setSavedLanguage(newLang);
    setLanguage(newLang);
    setSaving(false);
  };

  const handleSaveChanges = async () => {
    // Aqui você pode salvar no Firestore as mudanças
    // Exemplo:
    // await setUserLanguage(user.uid, language);
    // await setDailyGoal(user.uid, dailyGoal);
    console.log("Mudanças salvas: ", { language, dailyGoal });
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
