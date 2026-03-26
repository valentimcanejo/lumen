import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { router } from "expo-router";
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
import { getDueCards, gradeCard, incrementCardsReviewed, type DueCard } from "../../repositories/progress.repo";
import { checkAndGrantAchievements } from "../../repositories/achievements.repo";
import { checkAndCompleteDailyMissions } from "../../repositories/missions.repo";
import { getPack } from "../../repositories/packs.repo";
import type { PackCard } from "../../models/pack";

type ReviewItem = DueCard & { card: PackCard };

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#7B8FE0]" />
    </Box>
  );
}

export default function ReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [done, setDone] = useState(false);
  const [gradedCount, setGradedCount] = useState(0);
  const [missionXpGained, setMissionXpGained] = useState(0);
  const missionCheckedRef = useRef(false);

  const flipScale = useSharedValue(1);
  const flipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flipScale.value }],
  }));

  useEffect(() => {
    if (!uid) return;
    loadDueCards(uid);
  }, [uid]);

  async function loadDueCards(userId: string) {
    try {
      const due = await getDueCards(userId);
      if (due.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Group by contentId+version+lang to batch load packs
      const packKeys = new Map<string, DueCard>();
      for (const d of due) {
        const key = `${d.contentId}:${d.version}:${d.lang}`;
        if (!packKeys.has(key)) packKeys.set(key, d);
      }

      const packMap = new Map<string, Map<string, PackCard>>();
      await Promise.all(
        Array.from(packKeys.values()).map(async (d) => {
          try {
            const pack = await getPack(d.contentId, d.version, d.lang);
            const cardMap = new Map<string, PackCard>();
            for (const c of pack.cards ?? []) cardMap.set(c.id, c);
            packMap.set(`${d.contentId}:${d.version}:${d.lang}`, cardMap);
          } catch {
            // skip pack if unavailable
          }
        }),
      );

      const resolved: ReviewItem[] = [];
      for (const d of due) {
        const key = `${d.contentId}:${d.version}:${d.lang}`;
        const cardMap = packMap.get(key);
        const card = cardMap?.get(d.cardId);
        if (card) resolved.push({ ...d, card });
      }

      setItems(resolved);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const current = items[index];
  const total = items.length;

  const progressValue = useMemo(() => {
    if (!total) return 0;
    return index / total;
  }, [index, total]);

  function revealCard() {
    Haptics.selectionAsync();
    flipScale.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(setShowBack)(true);
    });
  }

  useEffect(() => {
    if (showBack) {
      setRevealed(true);
      flipScale.value = withTiming(1, { duration: 180 });
    }
  }, [showBack]);

  function goNext(finalGradedCount?: number) {
    setRevealed(false);
    setShowBack(false);
    flipScale.value = 1;
    const count = finalGradedCount ?? gradedCount;
    const next = index + 1;

    // Fire mission as soon as threshold is reached — don't wait for all cards
    if (uid && count >= 3 && !missionCheckedRef.current) {
      missionCheckedRef.current = true;
      checkAndCompleteDailyMissions(uid, { cardsReviewed: count })
        .then(({ xpGranted }) => { if (xpGranted > 0) setMissionXpGained(xpGranted); })
        .catch(() => {});
    }

    if (next >= total) {
      setDone(true);
      if (uid && count > 0) {
        incrementCardsReviewed(uid, count).catch(() => {});
        checkAndGrantAchievements(uid, { quizScore: 0 }).catch(() => {});
      }
    } else {
      setIndex(next);
    }
  }

  function onGrade(g: "know" | "dont") {
    if (g === "know") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (uid && current) {
      gradeCard(uid, current.contentId, current.cardId, g, {
        version: current.version,
        lang: current.lang,
      }).catch(() => {});
    }
    const newCount = gradedCount + 1;
    setGradedCount(newCount);
    goNext(newCount);
  }

  if (loading) {
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center">
        <Text className="text-[#AAB0C0]">{t("common.loading")}</Text>
      </Box>
    );
  }

  // Empty state — no cards due
  if (total === 0) {
    return (
      <Box className="flex-1 bg-[#0B0F14]">
        <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>
        </Box>
        <Box className="flex-1 items-center justify-center px-8">
          <Text style={s.doneEmoji}>✅</Text>
          <Text style={s.doneTitle}>{t("session.review.empty_title")}</Text>
          <Text style={s.doneSubtitle}>{t("session.review.empty_subtitle")}</Text>
          <Pressable
            style={s.homeBtn}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={s.homeBtnText}>{t("session.review.go_home")}</Text>
          </Pressable>
        </Box>
      </Box>
    );
  }

  // Done state
  if (done) {
    return (
      <Box className="flex-1 bg-[#0B0F14]">
        <Box className="flex-1 items-center justify-center px-8">
          <Text style={s.doneEmoji}>🧠</Text>
          <Text style={s.doneTitle}>{t("session.review.done_title")}</Text>
          <Text style={s.doneSubtitle}>
            {t("session.review.done_subtitle", { count: gradedCount })}
          </Text>
          {missionXpGained > 0 && (
            <View style={s.missionBadge}>
              <Text style={s.missionBadgeText}>
                ⚡ {t("missions.completed")} · +{missionXpGained} XP
              </Text>
            </View>
          )}
          <Pressable
            style={s.homeBtn}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={s.homeBtnText}>{t("session.review.go_home")}</Text>
          </Pressable>
        </Box>
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
            {index + 1} / {total}
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">
          {t("session.review.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {t("session.review.subtitle", { count: total })}
        </Text>
        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={flipAnimStyle}>
          <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
            <VStack space="sm">
              <Text className="text-[#AAB0C0] text-[12px]">
                {showBack
                  ? t("session.review.answer")
                  : t("session.review.question")}
              </Text>
              <Text
                className="text-[#E6EAF2] font-semibold leading-[26px]"
                style={{ fontSize: showBack ? 16 : 18 }}
              >
                {showBack ? current.card.back : current.card.front}
              </Text>
            </VStack>
          </Box>
        </Animated.View>
      </ScrollView>

      <Box
        className="px-5 pt-3 border-t border-[#1A2233]"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {!revealed ? (
          <Pressable
            onPress={revealCard}
            className="h-[52px] rounded-2xl bg-[#7B8FE0] items-center justify-center"
          >
            <Text className="text-[#0B0F14] text-[16px] font-semibold">
              {t("session.review.reveal")}
            </Text>
          </Pressable>
        ) : (
          <HStack space="sm">
            <Pressable
              onPress={() => onGrade("know")}
              className="flex-1 h-[52px] rounded-2xl items-center justify-center"
              style={{ backgroundColor: "#5ED19A" }}
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {t("session.review.correct")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onGrade("dont")}
              className="flex-1 h-[52px] rounded-2xl items-center justify-center"
              style={{ backgroundColor: "#E26D6D" }}
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {t("session.review.wrong")}
              </Text>
            </Pressable>
          </HStack>
        )}
      </Box>
    </Box>
  );
}

const s = StyleSheet.create({
  doneEmoji: { fontSize: 56, textAlign: "center", marginBottom: 16 },
  doneTitle: {
    color: "#E6EAF2",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  doneSubtitle: {
    color: "#AAB0C0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  missionBadge: {
    backgroundColor: "#0D1A12",
    borderWidth: 1,
    borderColor: "#5ED19A44",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  missionBadgeText: {
    color: "#5ED19A",
    fontSize: 13,
    fontWeight: "700",
  },
  homeBtn: {
    backgroundColor: "#7B8FE0",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  homeBtnText: { color: "#0B0F14", fontSize: 16, fontWeight: "700" },
});
