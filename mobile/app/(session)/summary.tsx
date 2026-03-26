import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
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
  getDueCardCount,
  finishSession,
} from "../../repositories/progress.repo";
import {
  scheduleReviewReminder,
  scheduleStreakRiskNotification,
} from "../../services/notifications.service";
import { upsertLeaderboardEntry } from "../../repositories/leaderboard.repo";
import { auth } from "../../firebase/firebaseConfig";
import { toggleSaveContent, markContentCompleted } from "../../repositories/user.repo";
import { invalidateUserCache } from "../../hooks/useUser";
import { incrementContentCompletion } from "../../repositories/content_stats.repo";
import { ACHIEVEMENTS, type AchievementDef } from "../../repositories/achievements.repo";
import { todayYmd } from "../../repositories/session.repo";
import { usePack } from "../../hooks/usePack";
import {
  pickNextLesson,
  getCompletedTracks,
  getAllTrackIds,
  getLessonMeta,
} from "../../repositories/lessons.repo";
import { getCompletedContentIds, getSavedContentIds } from "../../repositories/user.repo";
import type { Lang } from "../../models/lang";
import type { AchievementId } from "../../models/user";
import { getLevelTier, xpToLevel, type TierInfo } from "../../models/user";

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
// Level-up modal (full-screen celebration)
// ---------------------------------------------------------------------------

function LevelUpModal({
  info,
  onDismiss,
}: {
  info: { level: number; tier: TierInfo };
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 300 });
    contentOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
    scale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 160 }));
    badgePulse.value = withDelay(600, withRepeat(
      withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1, true,
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: scale.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 300 }]} pointerEvents="auto">
      <Animated.View
        style={[backdropStyle, StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.88)" }]}
      />
      <Animated.View style={[cardStyle, { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }]}>
        {/* Tier badge */}
        <Animated.View style={[badgeStyle, {
          width: 110, height: 110, borderRadius: 55,
          backgroundColor: info.tier.color + "22",
          borderWidth: 3, borderColor: info.tier.color + "88",
          alignItems: "center", justifyContent: "center",
          marginBottom: 28,
        }]}>
          <Text style={{ fontSize: 48 }}>⬆️</Text>
        </Animated.View>

        {/* Labels */}
        <Text style={{ color: info.tier.color, fontSize: 13, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
          {t("session.summary.level_up")}
        </Text>
        <Text style={{ color: "#E6EAF2", fontSize: 72, fontWeight: "900", lineHeight: 80, marginBottom: 4 }}>
          {info.level}
        </Text>
        <View style={{
          backgroundColor: info.tier.color + "22",
          borderWidth: 1, borderColor: info.tier.color + "66",
          borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
          marginBottom: 48,
        }}>
          <Text style={{ color: info.tier.color, fontSize: 15, fontWeight: "700" }}>
            {info.tier.name}
          </Text>
        </View>

        {/* Dismiss button */}
        <View
          style={{
            backgroundColor: info.tier.color,
            paddingHorizontal: 48, paddingVertical: 16,
            borderRadius: 32,
          }}
        >
          <Text
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDismiss();
            }}
            style={{ color: "#0B0F14", fontSize: 16, fontWeight: "800" }}
          >
            {t("common.continue")}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated XP counter (total)
// ---------------------------------------------------------------------------

function XpCounter({ gained }: { gained: number }) {
  const [count, setCount] = useState(0);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });

    const duration = 900;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(gained * progress));
      if (progress >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gained]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[xpS.badge, containerStyle]}>
      <Text style={xpS.text}>+{count} XP</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// XP breakdown rows shown below the progress bar
// ---------------------------------------------------------------------------

function XpBreakdown({
  base, quizBonus, missionBonus, quizPct,
}: {
  base: number; quizBonus: number; missionBonus: number; quizPct: number;
}) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(600, withTiming(1, { duration: 400 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const rows: { label: string; xp: number }[] = [
    { label: t("session.summary.xp_row_session"), xp: base },
    { label: t("session.summary.xp_row_quiz", { pct: Math.round(quizPct * 100) }), xp: quizBonus },
    ...(missionBonus > 0
      ? [{ label: t("session.summary.xp_row_mission"), xp: missionBonus }]
      : []),
  ];

  return (
    <Animated.View style={[style, { marginTop: 12 }]}>
      <View style={{ height: 1, backgroundColor: "#1A2233", marginBottom: 10 }} />
      {rows.map((row) => (
        <View
          key={row.label}
          style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}
        >
          <Text style={{ color: "#7B8193", fontSize: 11 }}>{row.label}</Text>
          <Text style={{ color: "#5ED19A", fontSize: 11, fontWeight: "700" }}>
            +{row.xp} XP
          </Text>
        </View>
      ))}
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
  const hasStartedRef = useRef(false);
  const [nextGoalId, setNextGoalId] = useState<string | null>(null);
  const [gainedXp, setGainedXp] = useState<number | null>(null);
  const [xpBreakdown, setXpBreakdown] = useState<{
    base: number; quizBonus: number; missionBonus: number;
  } | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; tier: TierInfo } | null>(null);
  const completedIdsRef = useRef<string[]>([]);

  // Auto-save once uid is available (uid may be null on first render if auth
  // state was cleared — e.g. after a full DEV reset with AsyncStorage.clear())
  useEffect(() => {
    if (!uid) return;
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    onFinish();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      getUserData({ userId: uid }),
      getCompletedContentIds(uid),
      getSavedContentIds(uid),
    ]).then(([user, completed, saved]) => {
      completedIdsRef.current = completed;
      const trackIds = user?.selectedTrackIds ?? user?.selectedGoalIds ?? [];
      const today = new Date().toISOString().slice(0, 10);
      // Include current lesson as completed for the "next" calculation
      const withCurrent = Array.from(new Set([...completed, contentId]));
      const nextId = pickNextLesson(trackIds, withCurrent, today, contentId);
      if (nextId && nextId !== contentId) setNextGoalId(nextId);
      setBookmarked(saved.includes(contentId));
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

  const highlightCard = useMemo(() => {
    if (!pack) return null;
    const quote = pack.lesson.blocks.find((b) => b.type === "quote");
    if (quote && "text" in quote) return `"${quote.text}"`;
    if (pack.cards.length > 0) return pack.cards[0].back;
    return null;
  }, [pack]);

  async function onFinish() {
    setSaving(true);
    try {
      if (uid) {
        const date = todayYmd();
        const quizDone = Number(total ?? 0) > 0;

        // Compute track completion (include current contentId as it's being completed)
        const withCurrent = [...new Set([...completedIdsRef.current, contentId])];
        const completedTrackCount = getCompletedTracks(withCurrent).length;
        const totalTrackCount = getAllTrackIds().length;

        // estimatedMinutes: prefer loaded pack, fall back to bundled meta (always available)
        const estimatedMinutes =
          pack?.estimatedMinutes ?? getLessonMeta(contentId)?.estimatedMinutes ?? 0;

        // finishSession must run FIRST — its idempotency guard reads the daily_sessions
        // doc that markDayCompleted writes. Running them in parallel would cause a race.
        const sessionResult = await finishSession(uid, { date, contentId, quizScore, quizDone, completedTrackCount, totalTrackCount });

        // After finishSession, the remaining writes touch different paths — safe to parallelize.
        await Promise.all([
          markDayCompleted(uid, date, {
            contentId,
            contentVersion: Number(version),
            minutes: estimatedMinutes,
            quizScore,
          }),
          markContentCompleted(uid, contentId),
          incrementContentCompletion(contentId, quizScore, estimatedMinutes).catch(() => {}),
        ]);

        const { gained, base, quizBonus, missionBonus, weeklyMissionBonus, starterBonus, newAchievementIds, leveledUp, newLevel, shieldEarned, newStreak } = sessionResult;

        // Leaderboard — fire-and-forget, does not block UI
        const displayName = auth.currentUser?.displayName
          ?? `Jogador #${uid.slice(-4).toUpperCase()}`;
        const newTier = getLevelTier(newLevel);
        upsertLeaderboardEntry(uid, displayName, gained + missionBonus, newLevel, newTier.id).catch(() => {});
        setGainedXp(gained + missionBonus + weeklyMissionBonus + starterBonus);
        setXpBreakdown({ base, quizBonus, missionBonus });
        const defs = newAchievementIds
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
          .filter(Boolean) as AchievementDef[];
        setNewAchievements(defs);
        if (leveledUp) {
          setLevelUpInfo({ level: newLevel, tier: getLevelTier(newLevel) });
          setConfettiActive(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (defs.length > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (missionBonus > 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Invalidate cache so next home load gets fresh user data
        invalidateUserCache(uid);

        // Streak at-risk notification for tomorrow 8 pm
        scheduleStreakRiskNotification(
          newStreak,
          "🔥 Não quebre sua sequência!",
          `Sua sequência de ${newStreak} dia${newStreak !== 1 ? "s" : ""} termina esta noite. Complete uma lição!`,
        ).catch(() => {});

        // Schedule review notification if there are due cards
        const dueCount = await getDueCardCount(uid);
        if (dueCount > 0) {
          scheduleReviewReminder(
            "Cards para revisar 🧠",
            `Você tem ${dueCount} card(s) para revisar. Não perca o ritmo!`,
          ).catch(() => {});
        }
      }
      setSaved(true);
      if (scorePct >= 0.6) setConfettiActive(true);
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
      {levelUpInfo && (
        <LevelUpModal info={levelUpInfo} onDismiss={() => setLevelUpInfo(null)} />
      )}

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

      {/* Scrollable content */}
      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
          {/* Score + XP */}
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

          {gainedXp !== null && xpBreakdown !== null && (
            <XpBreakdown
              base={xpBreakdown.base}
              quizBonus={xpBreakdown.quizBonus}
              missionBonus={xpBreakdown.missionBonus}
              quizPct={totalN > 0 ? scorePct : 0}
            />
          )}

          {/* What you learned — content-specific takeaway */}
          <Box className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: "#1A2233" }}>
            <Text className="text-[#AAB0C0] text-[11px] font-semibold tracking-widest uppercase mb-2">
              {t("session.summary.insight_label")}
            </Text>
            <Text className="text-[#E6EAF2] text-[15px] leading-[24px] font-medium">
              {pack?.lesson?.summary ?? insight}
            </Text>
          </Box>

          {/* Key concept — quote from lesson or first card */}
          {highlightCard && (
            <Box
              className="mt-3 rounded-[14px] p-4"
              style={{ backgroundColor: "#0E141E", borderWidth: 1, borderColor: "#1A2233" }}
            >
              <HStack space="sm" className="items-start">
                <Ionicons name="bulb-outline" size={15} color="#F5C77A" style={{ marginTop: 2 }} />
                <Text className="text-[#C8CDD8] text-[13px] leading-[20px] flex-1">
                  {highlightCard}
                </Text>
              </HStack>
            </Box>
          )}

          {/* Score-based coaching note — subtle, only when pack summary is available */}
          {pack?.lesson?.summary && (
            <Text className="text-[#7B8193] text-[12px] leading-[18px] mt-3">
              {insight}
            </Text>
          )}
        </Box>
      </ScrollView>

      {/* Fixed buttons */}
      <Box className="px-5" style={{ paddingBottom: Math.max(insets.bottom, 24), paddingTop: 12 }}>
        <VStack space="sm">
          {!saved ? (
            <Box className="h-[52px] items-center justify-center">
              <ActivityIndicator color="#F5C77A" />
            </Box>
          ) : (
            <>
              {nextGoalId && (
                <Pressable
                  onPress={nextContent}
                  className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
                >
                  <Text className="text-[#0B0F14] text-[16px] font-semibold">
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
            </>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
