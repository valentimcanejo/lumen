import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  withSpring,
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

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

const { width: SW, height: SH } = Dimensions.get("window");
const CONFETTI_COLORS = [
  "#F5C77A", "#5ED19A", "#7B8FE0", "#E26D6D",
  "#F0D060", "#8BE0D8", "#FF8A65", "#F48FB1",
];

type PConf = {
  x: number; color: string; size: number;
  delay: number; duration: number; circle: boolean; sway: number;
};

// Generated once at module load — stable across renders
const PARTICLES: PConf[] = Array.from({ length: 60 }, (_, i) => {
  const rng = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  return {
    x: rng(i * 3) * SW,
    color: CONFETTI_COLORS[Math.floor(rng(i * 3 + 1) * CONFETTI_COLORS.length)],
    size: 6 + rng(i * 3 + 2) * 8,
    delay: rng(i + 10) * 700,
    duration: 2200 + rng(i + 20) * 1200,
    circle: rng(i + 30) > 0.5,
    sway: (rng(i + 40) - 0.5) * 120,
  };
});

function ConfettiPiece({ p, active }: { p: PConf; active: boolean }) {
  const y = useSharedValue(-30);
  const x = useSharedValue(0);
  const r = useSharedValue(0);
  const o = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    y.value = withDelay(p.delay, withTiming(SH + 80, { duration: p.duration }));
    x.value = withDelay(
      p.delay,
      withSequence(
        withTiming(p.sway, { duration: p.duration * 0.5 }),
        withTiming(-p.sway * 0.4, { duration: p.duration * 0.5 }),
      ),
    );
    r.value = withDelay(p.delay, withRepeat(withTiming(360, { duration: 500 }), -1, false));
    o.value = withDelay(
      p.delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(p.duration - 500, withTiming(0, { duration: 500 })),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${r.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          left: p.x,
          top: 0,
          width: p.size,
          height: p.size,
          borderRadius: p.circle ? p.size / 2 : 2,
          backgroundColor: p.color,
        },
      ]}
    />
  );
}

function ConfettiOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }}
    >
      {PARTICLES.map((p, i) => (
        <ConfettiPiece key={i} p={p} active={active} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Animated XP counter
// ---------------------------------------------------------------------------

function XpCounter({ gained }: { gained: number }) {
  const count = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    count.value = withTiming(gained, { duration: 900 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gained]);

  const displayed = useDerivedValue(() => `+${Math.round(count.value)} XP`);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[xpS.badge, containerStyle]}>
      <Animated.Text style={xpS.text}>{displayed}</Animated.Text>
    </Animated.View>
  );
}

const xpS = StyleSheet.create({
  badge: {
    backgroundColor: "#0F2218",
    borderWidth: 1.5,
    borderColor: "#5ED19A",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: "center",
    marginTop: 10,
  },
  text: {
    color: "#5ED19A",
    fontSize: 16,
    fontWeight: "800",
  },
});

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

  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { getUserData } = useUser();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nextGoalId, setNextGoalId] = useState<string | null>(null);
  const [gainedXp, setGainedXp] = useState<number | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

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
      setConfettiActive(true);
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
      <ConfettiOverlay active={confettiActive} />
      <AchievementToast achievements={newAchievements} />

      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
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
              {gainedXp !== null && <XpCounter gained={gainedXp} />}
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

        <VStack space="sm" className="mt-auto" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
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
