import React, { useEffect } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
import { incrementContentStart } from "../../repositories/content_stats.repo";
import { getLessonMeta } from "../../repositories/lessons.repo";
import { usePremium } from "../../hooks/usePremium";
import { getStorageDownloadUrl } from "../../services/storage.service";
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

  const { isPremium } = usePremium();

  // Gate: if this is a premium lesson and user is not premium, redirect to paywall
  const lessonMeta = getLessonMeta(contentId);
  const color = trackColor(lessonMeta?.trackId ?? contentId);
  const bg = trackBg(lessonMeta?.trackId ?? contentId);
  const diffLabel = DIFFICULTY_LABELS[difficulty]?.[lang ?? "pt"] ?? difficulty;
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? "#AAB0C0";
  const isPremiumLocked = lessonMeta?.tier === "premium" && !isPremium;

  // Pre-warm the audio download URL while user reads the intro.
  // If the URL resolves, lesson.tsx skips the generation step entirely.
  // If it fails (audio not yet generated), lesson.tsx handles generation
  // and shows the "first explorer" message.
  useEffect(() => {
    if (!isPremium) return;
    const storagePath = `packs/${contentId}/v${version}/audio/${lang}_gpt.mp3`;
    getStorageDownloadUrl(storagePath).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startLesson() {
    if (isPremiumLocked) {
      router.replace("/(premium)/paywall");
      return;
    }
    incrementContentStart(contentId).catch(() => {});
    router.push({
      pathname: "/(session)/lesson",
      params: { contentId, version, lang },
    });
  }

  const STEPS = [
    {
      icon: "book-outline" as const,
      labelKey: isPremium ? "session.intro.includes_lesson" : "session.intro.includes_lesson_free",
    },
    {
      icon: "layers-outline" as const,
      labelKey: "session.intro.includes_cards",
    },
    {
      icon: "help-circle-outline" as const,
      labelKey: "session.intro.includes_quiz",
    },
  ];

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      {/* Tall colored header — title lives here */}
      <View
        style={[
          s.header,
          {
            backgroundColor: bg,
            paddingTop: insets.top + 8,
            borderBottomColor: color + "30",
          },
        ]}
      >
        {/* Decorative rings */}
        <View style={[s.circle1, { borderColor: color + "20" }]} />
        <View style={[s.circle2, { borderColor: color + "0E" }]} />

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.back}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={color} />
        </TouchableOpacity>

        {/* Meta row */}
        <View style={s.metaRow}>
          <View
            style={[
              s.diffBadge,
              {
                backgroundColor: diffColor + "25",
                borderColor: diffColor + "55",
              },
            ]}
          >
            <Text style={[s.diffText, { color: diffColor }]}>{diffLabel}</Text>
          </View>
          <View style={s.timeBadge}>
            <Ionicons name="time-outline" size={12} color="#7B8193" />
            <Text style={s.timeText}>{estimatedMinutes} min</Text>
          </View>
        </View>

        {/* Title inside header */}
        <Text style={s.headerTitle} numberOfLines={3}>
          {title}
        </Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingTop: 28, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* What's included */}
        <View style={s.stepsCard}>
          {STEPS.map(({ icon, labelKey }, i) => (
            <View key={labelKey}>
              {i > 0 && <View style={s.stepDivider} />}
              <View style={s.stepRow}>
                <View style={[s.stepIcon, { backgroundColor: color + "18" }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <Text style={s.stepLabel}>{t(labelKey)}</Text>
                <Ionicons name="checkmark" size={16} color={color + "80"} />
              </View>
            </View>
          ))}
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    bottom: -90,
    right: -50,
  },
  circle2: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    bottom: -160,
    right: -110,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  diffText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    color: "#7B8193",
    fontSize: 12,
    fontWeight: "500",
  },
  headerTitle: {
    color: "#E6EAF2",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 33,
    letterSpacing: -0.3,
  },
  stepsCard: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderRadius: 20,
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepLabel: {
    color: "#C8CDD8",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#1A2233",
    marginHorizontal: 18,
  },
});
