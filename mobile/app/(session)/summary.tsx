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
  recordSessionAndScheduleSmartReminder,
} from "../../services/notifications.service";
import { upsertLeaderboardEntry } from "../../repositories/leaderboard.repo";
import { auth } from "../../firebase/firebaseConfig";
import { toggleSaveContent, markContentCompleted } from "../../repositories/user.repo";
import { invalidateUserCache } from "../../hooks/useUser";
import { incrementContentCompletion } from "../../repositories/content_stats.repo";
import { ACHIEVEMENTS, type AchievementDef } from "../../repositories/achievements.repo";
import { CertificateModal } from "./_components/CertificateModal";
import { todayYmd } from "../../repositories/session.repo";
import { usePack } from "../../hooks/usePack";
import {
  getCompletedTracks,
  getAllTrackIds,
  getLessonMeta,
} from "../../repositories/lessons.repo";
import { getCompletedContentIds, getSavedContentIds } from "../../repositories/user.repo";
import { saveGlossaryForLesson } from "../../repositories/glossary.repo";
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
// Streak recovery toast
// ---------------------------------------------------------------------------

function StreakRecoveryToast({ streak }: { streak: number }) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(600, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(2500, withTiming(0, { duration: 400 })),
    ));
    translateY.value = withDelay(600, withTiming(0, { duration: 300 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[style, { position: "absolute", top: 100, left: 20, right: 20, zIndex: 99 }]}
    >
      <Box className="bg-[#1A2233] border border-[#F5A623]/40 rounded-2xl px-5 py-4">
        <HStack space="sm" className="items-center">
          <Text className="text-[22px]">🔥</Text>
          <VStack>
            <Text className="text-[#F5A623] text-[13px] font-bold">
              {t("session.summary.streak_recovered")}
            </Text>
            <Text className="text-[#AAB0C0] text-[12px]">
              {t("session.summary.streak_recovered_body", { count: streak })}
            </Text>
          </VStack>
        </HStack>
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
        <Animated.View style={[badgeStyle, { marginBottom: 28 }]}>
          <View style={{
            width: 110, height: 110, borderRadius: 55,
            backgroundColor: info.tier.color + "22",
            borderWidth: 3, borderColor: info.tier.color + "88",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="arrow-up" size={52} color={info.tier.color} />
          </View>
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
        <Pressable
          onPress={() => {
            badgePulse.value = withTiming(1, { duration: 100 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          style={{
            backgroundColor: info.tier.color,
            paddingHorizontal: 48, paddingVertical: 16,
            borderRadius: 32,
          }}
        >
          <Text style={{ color: "#0B0F14", fontSize: 16, fontWeight: "800" }}>
            {t("common.continue")}
          </Text>
        </Pressable>
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

// ---------------------------------------------------------------------------
// Summary result card styles
// ---------------------------------------------------------------------------

const sr = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 26,
    overflow: "hidden",
  },
  accentBar: {
    height: 3,
    width: "100%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  cardInner: {
    padding: 20,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  scoreLeft: {
    flex: 1,
    marginRight: 16,
  },
  perfLabel: {
    color: "#AAB0C0",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scoreLabel: {
    color: "#E6EAF2",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  scoreDetail: {
    color: "#7B8193",
    fontSize: 13,
    marginTop: 2,
  },
  scoreRight: {
    alignItems: "center",
    gap: 6,
  },
  scoreEmoji: {
    fontSize: 32,
    lineHeight: 38,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0E141E",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreCircleText: {
    fontSize: 20,
    fontWeight: "900",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#1A2233",
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A2233",
    marginTop: 16,
    marginBottom: 14,
  },
  insightBox: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightEyebrow: {
    color: "#AAB0C0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  insightText: {
    color: "#E6EAF2",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
  coachNote: {
    color: "#7B8193",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  conceptBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 12,
    backgroundColor: "#0D1525",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 14,
    padding: 16,
  },
  bulbBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5C77A15",
    borderWidth: 1,
    borderColor: "#F5C77A30",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  conceptText: {
    color: "#C8CDD8",
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
});

export default function SummaryScreen() {
  const { t } = useTranslation();
  const { contentId, version, lang, correct, total, hardcore: hardcoreParam } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
    correct?: string;
    total?: string;
    hardcore?: string;
  };
  const hardcore = hardcoreParam === "true";

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
  const [gainedXp, setGainedXp] = useState<number | null>(null);
  const [xpBreakdown, setXpBreakdown] = useState<{
    base: number; quizBonus: number; missionBonus: number;
  } | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; tier: TierInfo } | null>(null);
  const [recoveredStreak, setRecoveredStreak] = useState<number | null>(null);
  const [certificateInfo, setCertificateInfo] = useState<{ trackId: string; trackName: string; userName: string } | null>(null);
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
        const tracksBefore = getCompletedTracks(completedIdsRef.current);
        const withCurrent = [...new Set([...completedIdsRef.current, contentId])];
        const tracksAfter = getCompletedTracks(withCurrent);
        const completedTrackCount = tracksAfter.length;
        const totalTrackCount = getAllTrackIds().length;
        const newlyCompletedTrackId = tracksAfter.find((id) => !tracksBefore.includes(id));

        // estimatedMinutes: prefer loaded pack, fall back to bundled meta (always available)
        const estimatedMinutes =
          pack?.estimatedMinutes ?? getLessonMeta(contentId)?.estimatedMinutes ?? 0;

        // finishSession must run FIRST — its idempotency guard reads the daily_sessions
        // doc that markDayCompleted writes. Running them in parallel would cause a race.
        const sessionResult = await finishSession(uid, { date, contentId, quizScore, quizDone, completedTrackCount, totalTrackCount, hardcore });

        // After finishSession, the remaining writes touch different paths — safe to parallelize.
        // Save glossary entries from this lesson's cards (fire-and-forget)
        if (pack?.cards?.length) {
          const meta = getLessonMeta(contentId);
          saveGlossaryForLesson(uid, {
            contentId,
            trackId: meta?.trackId ?? "",
            lessonTitle: meta?.title?.[lang as Lang] ?? contentId,
            lang,
            entries: pack.cards.map((c) => ({ term: c.front, definition: c.back })),
          }).catch(() => {});
        }

        await Promise.all([
          markDayCompleted(uid, date, {
            contentId,
            contentVersion: Number(version),
            trackId: getLessonMeta(contentId)?.trackId ?? "",
            lessonTitle: getLessonMeta(contentId)?.title?.[lang as Lang] ?? contentId,
            minutes: estimatedMinutes,
            quizScore,
          }),
          markContentCompleted(uid, contentId),
          incrementContentCompletion(contentId, quizScore, estimatedMinutes).catch(() => {}),
        ]);

        const { gained, base, quizBonus, missionBonus, weeklyMissionBonus, starterBonus, newAchievementIds, leveledUp, newLevel, shieldEarned, newStreak, streakRecoveryCompleted, hardcoreBonus } = sessionResult;

        // Leaderboard — fire-and-forget, does not block UI
        const displayName = auth.currentUser?.displayName
          ?? `Jogador #${uid.slice(-4).toUpperCase()}`;
        const newTier = getLevelTier(newLevel);
        upsertLeaderboardEntry(uid, displayName, gained + missionBonus, newLevel, newTier.id).catch(() => {});
        setGainedXp(gained + missionBonus + weeklyMissionBonus + starterBonus);
        setXpBreakdown({ base, quizBonus: quizBonus + (hardcoreBonus ?? 0), missionBonus });
        const defs = newAchievementIds
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
          .filter(Boolean) as AchievementDef[];
        setNewAchievements(defs);
        if (streakRecoveryCompleted) {
          setRecoveredStreak(newStreak);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
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

        // Show certificate if a track was just fully completed
        if (newlyCompletedTrackId) {
          const { getTracks } = await import("../../repositories/tracks.repo");
          const tracks = await getTracks();
          const track = tracks.find((tr) => tr.id === newlyCompletedTrackId);
          const trackName = track?.title?.[lang as Lang] ?? newlyCompletedTrackId;
          const userName = auth.currentUser?.displayName ?? t("certificate.default_name");
          setCertificateInfo({ trackId: newlyCompletedTrackId, trackName, userName });
        }

        // Streak at-risk notification for tomorrow 8 pm
        scheduleStreakRiskNotification(
          newStreak,
          t("notifications.streak_risk_title"),
          t("notifications.streak_risk_body", { count: newStreak }),
        ).catch(() => {});

        // Smart daily reminder — records this session's hour and adapts schedule
        recordSessionAndScheduleSmartReminder(
          t("notifications.smart_reminder_title"),
          t("notifications.smart_reminder_body"),
        ).catch(() => {});

        // Schedule review notification if there are due cards
        const dueCount = await getDueCardCount(uid);
        if (dueCount > 0) {
          scheduleReviewReminder(
            t("session.review.notification_title"),
            t("session.review.notification_body", { count: dueCount }),
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


  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <ConfettiOverlay active={confettiActive} />
      <AchievementToast achievements={newAchievements} />
      {recoveredStreak !== null && <StreakRecoveryToast streak={recoveredStreak} />}
      {levelUpInfo && (
        <LevelUpModal info={levelUpInfo} onDismiss={() => setLevelUpInfo(null)} />
      )}
      {certificateInfo && (
        <CertificateModal
          visible
          trackId={certificateInfo.trackId}
          trackName={certificateInfo.trackName}
          userName={certificateInfo.userName}
          completedDate={todayYmd()}
          onClose={() => setCertificateInfo(null)}
        />
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
          {pack?.lesson?.title ?? t("common.content")}
        </Text>
        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      {/* Scrollable content */}
      {(() => {
        const scoreColor =
          scorePct >= 0.85 ? "#5ED19A" :
          scorePct >= 0.6  ? "#F5C77A" :
                             "#7B8193";

        return (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={sr.card}>
              {/* Top accent bar */}
              <View style={[sr.accentBar, { backgroundColor: scoreColor }]} />

              <View style={sr.cardInner}>
                {/* Score row */}
                <View style={sr.scoreRow}>
                  {/* Left: labels */}
                  <View style={sr.scoreLeft}>
                    <Text style={sr.perfLabel}>{t("session.summary.performance")}</Text>
                    <Text style={sr.scoreLabel}>{scoreLabel}</Text>
                    {totalN > 0 ? (
                      <Text style={sr.scoreDetail}>
                        {correctN} / {totalN} {t("session.summary.correct_answers")}
                      </Text>
                    ) : (
                      <Text style={sr.scoreDetail}>{t("session.summary.quiz_skipped")}</Text>
                    )}
                  </View>

                  {/* Right: circle + XP */}
                  <View style={sr.scoreRight}>
                    <View style={[sr.scoreCircle, { borderColor: scoreColor }]}>
                      <Text style={[sr.scoreCircleText, { color: scoreColor }]}>
                        {totalN > 0 ? Math.round(scorePct * 100) : 100}%
                      </Text>
                    </View>
                    {gainedXp !== null && <XpCounter gained={gainedXp} />}
                  </View>
                </View>

                {/* Progress bar */}
                <View style={sr.progressTrack}>
                  <View
                    style={[
                      sr.progressFill,
                      {
                        width: `${(totalN > 0 ? scorePct : 1) * 100}%`,
                        backgroundColor: scoreColor,
                      },
                    ]}
                  />
                </View>

                {/* XP breakdown */}
                {gainedXp !== null && xpBreakdown !== null && (
                  <XpBreakdown
                    base={xpBreakdown.base}
                    quizBonus={xpBreakdown.quizBonus}
                    missionBonus={xpBreakdown.missionBonus}
                    quizPct={totalN > 0 ? scorePct : 0}
                  />
                )}

                {/* Insight section */}
                <View style={sr.divider} />
                <View style={[sr.insightBox, { borderLeftColor: scoreColor, backgroundColor: scoreColor + "0D" }]}>
                  <Text style={sr.insightEyebrow}>{t("session.summary.insight_label")}</Text>
                  <Text style={sr.insightText}>{pack?.lesson?.summary ?? insight}</Text>
                </View>

                {/* Coaching note */}
                {pack?.lesson?.summary && (
                  <Text style={sr.coachNote}>{insight}</Text>
                )}

                {/* Key concept */}
                {highlightCard && (
                  <View style={sr.conceptBox}>
                    <View style={sr.bulbBadge}>
                      <Ionicons name="bulb-outline" size={14} color="#F5C77A" />
                    </View>
                    <Text style={sr.conceptText}>{highlightCard}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        );
      })()}

      {/* Fixed buttons */}
      <Box className="px-5" style={{ paddingBottom: Math.max(insets.bottom + 12, 24), paddingTop: 12 }}>
        <VStack space="sm">
          {!saved ? (
            <Box className="h-[52px] items-center justify-center">
              <ActivityIndicator color="#F5C77A" />
            </Box>
          ) : (
            <Pressable
                onPress={goHome}
                className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
              >
                <Text className="text-[#0B0F14] text-[16px] font-semibold">
                  {t("session.summary.go_home")}
                </Text>
              </Pressable>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
