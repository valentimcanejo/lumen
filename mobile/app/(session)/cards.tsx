import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View as RNView, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { useAuth } from "../../hooks/useAuth";
import { usePack } from "../../hooks/usePack";
import { SessionError } from "./_components/SessionError";
import { gradeCard } from "../../repositories/progress.repo";
import type { Lang } from "../../models/lang";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

type Grade = "know" | "dont";

export default function CardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentId, version, lang } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
  };
  const { uid } = useAuth();

  const { pack, loading, error } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  const cards = pack?.cards ?? [];
  const total = cards.length;

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const flipScale = useSharedValue(1);
  const flipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flipScale.value }],
  }));

  const current = cards[index];

  const progressValue = useMemo(() => {
    if (!total) return 0.35;
    const stepStart = 0.25;
    const stepEnd = 0.5;
    const pct = index / Math.max(1, total);
    return stepStart + (stepEnd - stepStart) * pct;
  }, [index, total]);

  function revealCard() {
    Haptics.selectionAsync();
    flipScale.value = withTiming(0, { duration: 180 }, (done) => {
      if (done) runOnJS(setShowBack)(true);
    });
  }

  useEffect(() => {
    if (showBack) {
      setRevealed(true);
      flipScale.value = withTiming(1, { duration: 180 });
    }
  }, [showBack]);

  function goNext() {
    setRevealed(false);
    setShowBack(false);
    flipScale.value = 1;
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= total) {
        router.push({
          pathname: "/(session)/quiz",
          params: { contentId, version, lang },
        });
        return prev;
      }
      return next;
    });
  }

  function onGrade(g: Grade) {
    if (g === "know") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (uid && current) {
      gradeCard(uid, contentId, current.id, g, {
        version: Number(version),
        lang: lang ?? "pt",
      }).catch(() => {});
    }
    goNext();
  }

  if (error) return <SessionError message={error} />;

  if (loading) {
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center">
        <Text className="text-[#AAB0C0]">{t("common.loading")}</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={progressValue} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            {t("session.cards.step")}
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">
          {t("session.cards.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {pack?.lesson?.title ?? t("common.content")} •{" "}
          {total ? `${index + 1} / ${total}` : ""}
        </Text>

        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      {!pack || total === 0 ? (
        <Box className="px-5 pt-5">
          <VStack space="md">
            <Text className="text-[#AAB0C0]">{t("session.cards.empty")}</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/quiz",
                  params: { contentId, version, lang },
                })
              }
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {t("session.cards.go_to_quiz")}
              </Text>
            </Pressable>
          </VStack>
        </Box>
      ) : (
        <>
          {/* Card area — tap to reveal */}
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={!revealed ? revealCard : undefined}
              activeOpacity={revealed ? 1 : 0.88}
            >
              <Animated.View
                style={[
                  fc.card,
                  showBack && fc.cardBack,
                  flipAnimStyle,
                ]}
              >
                {/* Side label + counter */}
                <RNView style={fc.cardHeader}>
                  <RNView style={[fc.sidePill, showBack && fc.sidePillBack]}>
                    <Text style={[fc.sideLabel, showBack && fc.sideLabelBack]}>
                      {showBack ? t("session.cards.answer") : t("session.cards.question")}
                    </Text>
                  </RNView>
                  <Text style={fc.counter}>{index + 1}/{total}</Text>
                </RNView>

                {/* Content */}
                <Text style={[fc.content, showBack && fc.contentBack]}>
                  {showBack ? current.back : current.front}
                </Text>

                {/* Tap hint — only on front */}
                {!revealed && (
                  <RNView style={fc.tapHint}>
                    <Ionicons name="eye-outline" size={13} color="#3A4558" />
                    <Text style={fc.tapHintText}>{t("session.cards.reveal")}</Text>
                  </RNView>
                )}
              </Animated.View>
            </TouchableOpacity>
          </ScrollView>

          {/* Fixed bottom buttons */}
          <RNView style={[fc.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {!revealed ? (
              <TouchableOpacity onPress={revealCard} activeOpacity={0.85} style={fc.revealBtn}>
                <Ionicons name="eye-outline" size={18} color="#0B0F14" style={{ marginRight: 8 }} />
                <Text style={fc.revealBtnText}>{t("session.cards.reveal")}</Text>
              </TouchableOpacity>
            ) : (
              <RNView style={fc.gradeRow}>
                <TouchableOpacity
                  onPress={() => onGrade("dont")}
                  activeOpacity={0.85}
                  style={fc.gradeDont}
                >
                  <Ionicons name="close" size={20} color="#E26D6D" />
                  <Text style={fc.gradeDontText}>{t("session.cards.wrong")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onGrade("know")}
                  activeOpacity={0.85}
                  style={fc.gradeKnow}
                >
                  <Ionicons name="checkmark" size={20} color="#0B0F14" />
                  <Text style={fc.gradeKnowText}>{t("session.cards.correct")}</Text>
                </TouchableOpacity>
              </RNView>
            )}

            <TouchableOpacity onPress={goNext} activeOpacity={0.7} style={fc.skipBtn}>
              <Text style={fc.skipBtnText}>{t("session.cards.skip")}</Text>
            </TouchableOpacity>
          </RNView>
        </>
      )}
    </Box>
  );
}

const fc = StyleSheet.create({
  // Card
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderRadius: 24,
    padding: 22,
    minHeight: 240,
  },
  cardBack: {
    backgroundColor: "#0D1C14",
    borderColor: "#5ED19A28",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sidePill: {
    backgroundColor: "#F5C77A12",
    borderWidth: 1,
    borderColor: "#F5C77A28",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sidePillBack: {
    backgroundColor: "#5ED19A12",
    borderColor: "#5ED19A28",
  },
  sideLabel: {
    color: "#F5C77A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sideLabelBack: {
    color: "#5ED19A",
  },
  counter: {
    color: "#3A4558",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    color: "#E6EAF2",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 28,
    flex: 1,
  },
  contentBack: {
    fontSize: 17,
    color: "#DFF7EC",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 24,
    alignSelf: "center",
  },
  tapHintText: {
    color: "#3A4558",
    fontSize: 12,
    fontWeight: "500",
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A2233",
    gap: 10,
  },
  revealBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F5C77A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  revealBtnText: {
    color: "#0B0F14",
    fontSize: 16,
    fontWeight: "700",
  },
  gradeRow: {
    flexDirection: "row",
    gap: 10,
  },
  gradeDont: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E26D6D40",
    backgroundColor: "#1C0D0F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  gradeDontText: {
    color: "#E26D6D",
    fontSize: 15,
    fontWeight: "700",
  },
  gradeKnow: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#5ED19A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  gradeKnowText: {
    color: "#0B0F14",
    fontSize: 15,
    fontWeight: "700",
  },
  skipBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2A3E",
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    color: "#4A5568",
    fontSize: 14,
    fontWeight: "600",
  },
});
