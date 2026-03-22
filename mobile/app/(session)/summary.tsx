import React, { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import {
  markDayCompleted,
  updateStreak,
  grantSessionXP,
} from "../../repositories/progress.repo";
import { toggleSaveContent } from "../../repositories/user.repo";
import {
  checkAndGrantAchievements,
  ACHIEVEMENTS,
  type AchievementDef,
} from "../../repositories/achievements.repo";
import { todayYmd } from "../../repositories/session.repo";
import { usePack } from "../../hooks/usePack";
import type { Lang } from "../../models/lang";
import type { AchievementId } from "../../models/user";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function AchievementToast({
  achievements,
}: {
  achievements: AchievementDef[];
}) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(400, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(2000, withTiming(0, { duration: 400 })),
    ));
    translateY.value = withDelay(400, withTiming(0, { duration: 300 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!achievements.length) return null;

  return (
    <Animated.View
      style={[style, { position: "absolute", top: 100, left: 20, right: 20, zIndex: 99 }]}
    >
      <Box className="bg-[#1A2233] border border-[#F5C77A]/40 rounded-2xl px-5 py-4">
        <Text className="text-[#F5C77A] text-[12px] font-semibold mb-2">
          {t("session.summary.new_achievement")}
        </Text>
        {achievements.map((a) => (
          <HStack key={a.id} space="sm" className="items-center">
            <Text className="text-[18px]">{a.icon}</Text>
            <Text className="text-[#E6EAF2] text-[14px]">{t(a.titleKey)}</Text>
          </HStack>
        ))}
      </Box>
    </Animated.View>
  );
}

export default function SummaryScreen() {
  const { t } = useTranslation();
  const { contentId, version, lang, correct, total } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
    correct?: string;
    total?: string;
  };

  const { pack } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  const correctN = Number(correct ?? 0);
  const totalN = Number(total ?? 0);
  const scorePct = totalN > 0 ? clamp(correctN / totalN, 0, 1) : 0;
  const quizScore = totalN > 0 ? correctN / totalN : 1;

  const { uid } = useAuth();
  const { getUserData } = useUser();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nextGoalId, setNextGoalId] = useState<string | null>(null);
  const [gainedXp, setGainedXp] = useState<number | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((user) => {
      const ids = user?.selectedGoalIds ?? [];
      const idx = ids.indexOf(contentId);
      if (idx !== -1 && ids.length > 1) {
        const nextId = ids[(idx + 1) % ids.length];
        if (nextId !== contentId) setNextGoalId(nextId);
      }
      setBookmarked(user?.savedContentIds?.includes(contentId) ?? false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, contentId]);

  async function toggleBookmark() {
    if (!uid) return;
    const next = !bookmarked;
    setBookmarked(next);
    await toggleSaveContent(uid, contentId, next);
  }

  const scoreLabel = useMemo(() => {
    if (totalN === 0) return t("session.summary.score_completed");
    if (scorePct >= 0.85) return t("session.summary.score_excellent");
    if (scorePct >= 0.6) return t("session.summary.score_good");
    if (scorePct >= 0.35) return t("session.summary.score_start");
    return t("session.summary.score_keep_going");
  }, [scorePct, totalN, t]);

  const insight = useMemo(() => {
    if (totalN === 0) return t("session.summary.insight_no_quiz");
    if (scorePct >= 0.85) return t("session.summary.insight_excellent");
    if (scorePct >= 0.6) return t("session.summary.insight_good");
    if (scorePct >= 0.35) return t("session.summary.insight_start");
    return t("session.summary.insight_keep_going");
  }, [scorePct, totalN, t]);

  async function onFinish() {
    setSaving(true);
    try {
      if (uid) {
        const date = todayYmd();
        await markDayCompleted(uid, date, {
          contentId,
          contentVersion: Number(version),
          minutes: pack?.estimatedMinutes ?? 0,
          quizScore,
        });
        await updateStreak(uid, date);
        const { gained } = await grantSessionXP(uid, quizScore);
        setGainedXp(gained);
        const unlockedIds = await checkAndGrantAchievements(uid, { quizScore });
        const defs = unlockedIds
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
          .filter(Boolean) as AchievementDef[];
        setNewAchievements(defs);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function goHome() {
    router.replace("/(tabs)/home");
  }

  function nextContent() {
    if (nextGoalId) {
      router.replace({
        pathname: "/(session)/lesson",
        params: { contentId: nextGoalId, version: "1", lang: lang ?? "pt" },
      });
    } else {
      router.replace("/(tabs)/home");
    }
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <AchievementToast achievements={newAchievements} />

      <Box className="px-5 pt-14">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>
          <TopProgress value={0.95} />
          <Pressable onPress={toggleBookmark} className="p-1">
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={20}
              color={bookmarked ? "#F5C77A" : "#AAB0C0"}
            />
          </Pressable>
          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            {t("session.summary.step")}
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">
          {t("session.summary.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {pack?.lesson?.title ?? t("common.content")} • {pack?.estimatedMinutes ?? 0} min
        </Text>
        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      <Box className="flex-1 px-5 pt-5">
        <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
          <HStack className="items-center justify-between">
            <VStack space="xs">
              <Text className="text-[#AAB0C0] text-[12px]">
                {t("session.summary.performance")}
              </Text>
              <Text className="text-[#E6EAF2] text-[18px] font-semibold">
                {scoreLabel}
              </Text>
              {totalN > 0 ? (
                <Text className="text-[#7B8193] text-[13px] mt-1">
                  {correctN} / {totalN} {t("session.summary.correct_answers")}
                </Text>
              ) : (
                <Text className="text-[#7B8193] text-[13px] mt-1">
                  {t("session.summary.quiz_skipped")}
                </Text>
              )}
            </VStack>

            <VStack className="items-center" space="xs">
              <Box className="w-[64px] h-[64px] rounded-full bg-[#0E141E] border border-[#1A2233] items-center justify-center">
                <Text className="text-[#F5C77A] text-[18px] font-semibold">
                  {totalN > 0 ? Math.round(scorePct * 100) : 100}%
                </Text>
              </Box>
              {gainedXp !== null && (
                <Text className="text-[#5ED19A] text-[12px] font-semibold">
                  {t("session.summary.xp_gained", { xp: gainedXp })}
                </Text>
              )}
            </VStack>
          </HStack>

          <Box className="h-[6px] rounded-full bg-[#1A2233] overflow-hidden mt-4">
            <Box
              className="h-full bg-[#F5C77A]"
              style={{ width: `${(totalN > 0 ? scorePct : 1) * 100}%` }}
            />
          </Box>

          <Box className="mt-4">
            <Text className="text-[#AAB0C0] text-[12px]">
              {t("session.summary.insight_label")}
            </Text>
            <Text className="text-[#E6EAF2] text-[14px] leading-[22px] mt-2">
              {insight}
            </Text>
          </Box>
        </Box>

        <Box className="mt-5 h-[100px] rounded-[18px] bg-[#0E141E] border border-[#141C2A] overflow-hidden">
          <Box className="absolute inset-0 bg-black/10" />
          <HStack className="absolute bottom-4 left-5" space="xs">
            {Array.from({ length: 22 }).map((_, i) => (
              <Box key={i} className="w-[3px] h-[3px] rounded-full bg-[#AAB0C0]/20" />
            ))}
          </HStack>
        </Box>

        <VStack space="sm" className="pb-6 mt-auto">
          <Pressable
            onPress={onFinish}
            disabled={saving || saved}
            className={[
              "h-[52px] rounded-2xl items-center justify-center",
              saved ? "bg-[#5ED19A]" : "bg-[#F5C77A]",
            ].join(" ")}
          >
            <Text className="text-[#0B0F14] text-[16px] font-semibold">
              {saved
                ? t("session.summary.finished")
                : saving
                  ? t("session.summary.saving")
                  : t("session.summary.finish")}
            </Text>
          </Pressable>

          {nextGoalId && (
            <Pressable
              onPress={nextContent}
              className="h-[52px] rounded-2xl border border-[#1A2233] items-center justify-center"
            >
              <Text className="text-[#AAB0C0] text-[16px] font-semibold">
                {t("session.summary.next_content")}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={goHome}
            className="h-[52px] rounded-2xl border border-[#1A2233] items-center justify-center"
          >
            <Text className="text-[#AAB0C0] text-[16px] font-semibold">
              {t("session.summary.go_home")}
            </Text>
          </Pressable>
        </VStack>
      </Box>
    </Box>
  );
}
