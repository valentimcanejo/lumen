import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

import { LumenButton } from "../../components/ui/lumen/Button";
import { trackColor, trackBg } from "../../constants/tracks";
import type { Lang } from "../../models/lang";

const DIFFICULTY_LABELS: Record<string, Record<Lang, string>> = {
  "1": { pt: "Iniciante", en: "Beginner", es: "Principiante" },
  "2": { pt: "Intermediário", en: "Intermediate", es: "Intermedio" },
  "3": { pt: "Avançado", en: "Advanced", es: "Avanzado" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  "1": "#5ED19A",
  "2": "#F5C77A",
  "3": "#E26D6D",
};

export default function LessonIntroScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentId, version, lang, title, difficulty, estimatedMinutes } =
    useLocalSearchParams() as {
      contentId: string;
      version: string;
      lang: Lang;
      title: string;
      difficulty: string;
      estimatedMinutes: string;
    };

  const color = trackColor(contentId);
  const bg = trackBg(contentId);
  const diffLabel = DIFFICULTY_LABELS[difficulty]?.[lang ?? "pt"] ?? difficulty;
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? "#AAB0C0";

  function startLesson() {
    router.push({
      pathname: "/(session)/lesson",
      params: { contentId, version, lang },
    });
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      {/* Colored header block */}
      <Box
        style={[
          s.header,
          {
            backgroundColor: bg,
            borderBottomColor: `${color}33`,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <Box style={[s.circle1, { borderColor: `${color}22` }]} />
        <Box style={[s.circle2, { borderColor: `${color}11` }]} />

        <TouchableOpacity
          onPress={() => router.back()}
          style={s.back}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={color} />
        </TouchableOpacity>
      </Box>

      {/* Scrollable content */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Difficulty + time row */}
        <HStack className="items-center mb-4" space="sm">
          <Box style={[s.badge, { backgroundColor: `${diffColor}18` }]}>
            <Text style={{ color: diffColor, fontSize: 12, fontWeight: "600" }}>
              {diffLabel}
            </Text>
          </Box>
          <HStack className="items-center" space="xs">
            <Ionicons name="time-outline" size={13} color="#7B8193" />
            <Text className="text-[#7B8193] text-[12px]">
              {estimatedMinutes} min
            </Text>
          </HStack>
        </HStack>

        {/* Title */}
        <Text className="text-[#E6EAF2] text-[28px] font-bold leading-[34px] mb-6">
          {title}
        </Text>

        {/* What's included */}
        <VStack space="md">
          {[
            {
              icon: "book-outline" as const,
              labelKey: "session.intro.includes_lesson",
            },
            {
              icon: "layers-outline" as const,
              labelKey: "session.intro.includes_cards",
            },
            {
              icon: "help-circle-outline" as const,
              labelKey: "session.intro.includes_quiz",
            },
          ].map(({ icon, labelKey }) => (
            <HStack key={labelKey} className="items-center" space="sm">
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${color}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={icon} size={18} color={color} />
              </Box>
              <Text className="text-[#AAB0C0] text-[14px]">{t(labelKey)}</Text>
            </HStack>
          ))}
        </VStack>
      </ScrollView>

      {/* Fixed CTA */}
      <Box
        className="px-6 pt-3 border-t border-[#1A2233]"
        style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
      >
        <LumenButton onPress={startLesson} color={color}>
          {t("session.intro.start")}
        </LumenButton>
      </Box>
    </Box>
  );
}

const s = StyleSheet.create({
  header: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    bottom: -80,
    right: -40,
  },
  circle2: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    bottom: -140,
    right: -100,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
});
