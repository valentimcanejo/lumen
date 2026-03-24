import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { LumenCard } from "../../components/ui/lumen/Card";
import { LumenButton } from "../../components/ui/lumen/Button";
import { SkeletonCard } from "../../components/ui/lumen/Skeleton";

import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import {
  getLessonMeta,
  pickNextLesson,
  getNextLessonPerTrack,
  isAllContentCompleted,
  getAllTrackIds,
} from "../../repositories/lessons.repo";
import {
  getWeeklyData,
  getTodaySession,
  getDueCardCount,
  getRecentSessions,
  type DayData,
} from "../../repositories/progress.repo";
import { getCompletedContentIds } from "../../repositories/user.repo";
import { getTodayMissions } from "../../repositories/missions.repo";
import type { DailyMission } from "../../models/user";
import { todayYmd } from "../../repositories/session.repo";
import {
  type UserProfile,
  levelXpThreshold,
  xpToLevel,
  xpForNextLevel,
  getLevelTier,
} from "../../models/user";
import type { Lang } from "../../models/lang";

// ---------------------------------------------------------------------------
// Streak pill with pulsing animation
// ---------------------------------------------------------------------------

function StreakCard({ streak, shields }: { streak: number; shields: number }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        true,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (streak === 0) return null;

  return (
    <View style={sk.card}>
      <Animated.Text style={[sk.flame, flameStyle]}>🔥</Animated.Text>
      <View style={sk.textCol}>
        <Text style={sk.num}>{streak}</Text>
        <Text style={sk.label}>{t("tabs.home.streak")}</Text>
      </View>
      {shields > 0 && (
        <View style={sk.shieldBadge}>
          <Text style={sk.shieldText}>🛡️ {shields}</Text>
        </View>
      )}
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A120A",
    borderWidth: 1.5,
    borderColor: "#F5C77A44",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  flame: { fontSize: 32 },
  textCol: { gap: 1, flex: 1 },
  num: { color: "#F5C77A", fontSize: 28, fontWeight: "800", lineHeight: 32 },
  label: { color: "#AAB0C0", fontSize: 12, fontWeight: "500" },
  shieldBadge: {
    backgroundColor: "#0D1A2E",
    borderWidth: 1,
    borderColor: "#7B8FE044",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shieldText: { color: "#7B8FE0", fontSize: 13, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Daily missions card
// ---------------------------------------------------------------------------

function MissionsCard({ missions }: { missions: DailyMission[] }) {
  const { t } = useTranslation();

  return (
    <View style={ms.card}>
      <Text style={ms.title}>{t("missions.title")}</Text>
      {missions.map((m) => (
        <View key={m.id} style={ms.row}>
          <View style={[ms.check, m.completed && ms.checkDone]}>
            {m.completed && (
              <Ionicons name="checkmark" size={12} color="#0B0F14" />
            )}
          </View>
          <Text style={[ms.missionLabel, m.completed && ms.missionLabelDone]}>
            {t(`missions.${m.id}`)}
          </Text>
          <Text style={[ms.xpPill, m.completed && ms.xpPillDone]}>
            +{m.xpReward} XP
          </Text>
        </View>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  title: {
    color: "#AAB0C0",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#2A3448",
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: {
    backgroundColor: "#5ED19A",
    borderColor: "#5ED19A",
  },
  missionLabel: {
    flex: 1,
    color: "#AAB0C0",
    fontSize: 13,
  },
  missionLabelDone: {
    color: "#4A5568",
    textDecorationLine: "line-through",
  },
  xpPill: {
    color: "#5ED19A",
    fontSize: 12,
    fontWeight: "700",
  },
  xpPillDone: {
    color: "#2A4030",
  },
});

// ---------------------------------------------------------------------------
// Weekly bar chart
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<string, string[]> = {
  pt: ["S", "T", "Q", "Q", "S", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
  es: ["L", "M", "X", "J", "V", "S", "D"],
};

const wk = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 22,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  minutesNum: { color: "#F5C77A", fontSize: 28, fontWeight: "700" },
  minutesLabel: {
    color: "#AAB0C0",
    fontSize: 13,
    marginBottom: 3,
    marginLeft: 4,
  },
  badge: {
    backgroundColor: "#F5C77A22",
    borderWidth: 1,
    borderColor: "#F5C77A44",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#F5C77A", fontSize: 11, fontWeight: "600" },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayCol: { alignItems: "center", gap: 4 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dayLabel: { fontSize: 11, fontWeight: "600" },
  barTrack: {
    height: 5,
    backgroundColor: "#1A2233",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statsText: { color: "#4A5568", fontSize: 11 },
});

function WeeklyCard({
  data,
  goalMin,
  lang,
  studiedLabel,
}: {
  data: DayData[];
  goalMin: number;
  lang: string;
  studiedLabel: string;
}) {
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;
  const labels = DAY_LABELS[lang] ?? DAY_LABELS.en;
  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const weekGoal = goalMin * 7;
  const weekPct = weekGoal > 0 ? Math.min(totalMinutes / weekGoal, 1) : 0;
  const weekDone = weekPct >= 1;

  return (
    <View style={wk.card}>
      {/* Header */}

      <View style={wk.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Text style={wk.minutesNum}>{totalMinutes}</Text>
          <Text style={wk.minutesLabel}>min {studiedLabel}</Text>
        </View>
        {weekDone && (
          <View style={wk.badge}>
            <Text style={wk.badgeText}>🏆 Meta!</Text>
          </View>
        )}
      </View>

      {/* Day circles */}
      <View style={wk.daysRow}>
        {data.map((d, i) => {
          const done = d.minutes >= goalMin;
          const isToday = i === todayIndex;
          const isFuture = i > todayIndex;

          return (
            <View key={d.date} style={wk.dayCol}>
              <View
                style={[
                  wk.circle,
                  {
                    backgroundColor: done
                      ? "#F5C77A"
                      : isToday
                        ? "transparent"
                        : "#1A2233",
                    borderWidth: isToday && !done ? 2 : 0,
                    borderColor: "#F5C77A88",
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={18} color="#0B0F14" />
                ) : isToday ? (
                  <View style={[wk.dot, { backgroundColor: "#F5C77A" }]} />
                ) : isFuture ? null : (
                  <View
                    style={[
                      wk.dot,
                      {
                        backgroundColor: "#3A4458",
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                      },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  wk.dayLabel,
                  { color: isToday ? "#F5C77A" : "#4A5568" },
                ]}
              >
                {labels[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress bar */}
      <View style={wk.barTrack}>
        <View
          style={[
            wk.barFill,
            {
              width: `${weekPct * 100}%`,
              backgroundColor: weekDone ? "#5ED19A" : "#F5C77A",
            },
          ]}
        />
      </View>
      <View style={wk.statsRow}>
        <Text style={wk.statsText}>{Math.round(weekPct * 100)}%</Text>
        <Text style={wk.statsText}>
          {totalMinutes} / {weekGoal} min
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Welcome back modal
// ---------------------------------------------------------------------------

function WelcomeBackModal({
  visible,
  streak,
  onDismiss,
}: {
  visible: boolean;
  streak: number;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={wb.overlay}>
        <View style={wb.card}>
          <Text style={wb.title}>{t("tabs.home.welcome_back_title")}</Text>
          <Text style={wb.subtitle}>
            {streak > 0
              ? t("tabs.home.welcome_back_streak", { streak })
              : t("tabs.home.welcome_back_no_streak")}
          </Text>

          {streak > 0 && (
            <View style={wb.streakRow}>
              <Text style={wb.streakNum}>{streak}</Text>
              <Text style={wb.streakLabel}>🔥</Text>
            </View>
          )}
          <Pressable style={wb.btn} onPress={onDismiss}>
            <Text style={wb.btnText}>{t("tabs.home.welcome_back_cta")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const wb = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    alignItems: "center",
  },
  title: {
    color: "#E6EAF2",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#AAB0C0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 6,
  },
  streakNum: { color: "#F5C77A", fontSize: 48, fontWeight: "800" },
  streakLabel: { fontSize: 36 },
  btn: {
    marginTop: 24,
    backgroundColor: "#F5C77A",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  btnText: { color: "#0B0F14", fontSize: 16, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Home screen
// ---------------------------------------------------------------------------

export default function Home() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid: currentUserId } = useAuth();
  const { getUserData } = useUser();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [todayCompletedId, setTodayCompletedId] = useState<string | null>(null);
  const [dueCardCount, setDueCardCount] = useState(0);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [retryRecommendation, setRetryRecommendation] = useState<{
    contentId: string; quizScore: number;
  } | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    setLoadingUser(true);
    getUserData({ userId: currentUserId })
      .then((u) => setUser(u ?? null))
      .finally(() => setLoadingUser(false));
    getWeeklyData(currentUserId).then(setWeeklyData).catch(() => {});
    getTodaySession(currentUserId)
      .then((s) => setTodayCompletedId(s?.contentId ?? null))
      .catch(() => {});
    getDueCardCount(currentUserId).then(setDueCardCount).catch(() => {});
    getCompletedContentIds(currentUserId).then(setCompletedIds).catch(() => {});
    getTodayMissions(currentUserId).then(setMissions).catch(() => {});
    getRecentSessions(currentUserId, 20).then((sessions) => {
      const seen = new Set<string>();
      for (const s of sessions) {
        if (!seen.has(s.contentId)) {
          seen.add(s.contentId);
          if (s.quizScore < 0.6) {
            setRetryRecommendation({ contentId: s.contentId, quizScore: s.quizScore });
            break;
          }
        }
      }
    }).catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    const today = todayYmd();
    AsyncStorage.getItem("lastOpenDate").then((last) => {
      if (last && last !== today) setShowWelcomeBack(true);
      AsyncStorage.setItem("lastOpenDate", today);
    });
  }, []);

  const lang = (user?.lang ?? i18n.language ?? "pt") as Lang;
  const streak = user?.streak?.current ?? 0;
  const shields = user?.streak?.shields ?? 0;
  const xp = user?.xp ?? 0;
  const level = xpToLevel(xp);
  const tier = getLevelTier(level);
  const xpFloor = levelXpThreshold(level);
  const xpCeil = xpForNextLevel(level);
  const xpPct = xpCeil > xpFloor ? (xp - xpFloor) / (xpCeil - xpFloor) : 1;

  // Backward-compat: fall back to selectedGoalIds for users who haven't migrated
  const selectedTrackIds = user?.selectedTrackIds ?? user?.selectedGoalIds ?? [];
  const allContentDone =
    !loadingUser &&
    isAllContentCompleted(selectedTrackIds, completedIds) &&
    selectedTrackIds.length < getAllTrackIds().length;
  const today = todayYmd();
  const todayLessonId = pickNextLesson(selectedTrackIds, completedIds, today);
  const todayLesson = todayLessonId ? getLessonMeta(todayLessonId) : null;
  const nextPerTrack = getNextLessonPerTrack(selectedTrackIds, completedIds);

  function startSession(contentId: string) {
    const meta = getLessonMeta(contentId);
    router.push({
      pathname: "/(session)/intro",
      params: {
        contentId,
        version: String(meta?.version ?? 1),
        lang,
        title: meta?.title[lang] ?? meta?.title.en ?? contentId,
        difficulty: String(meta?.difficulty ?? 1),
        estimatedMinutes: String(meta?.estimatedMinutes ?? 0),
      },
    });
  }

  return (
    <>
      <WelcomeBackModal
        visible={showWelcomeBack}
        streak={streak}
        onDismiss={() => setShowWelcomeBack(false)}
      />
      <ScrollView
        className="flex-1 bg-[#0B0F14]"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header with level + tier + XP bar */}
        <Box className="px-6" style={{ paddingTop: insets.top + 8 }}>
          <HStack className="items-center justify-between">
            <Text className="text-[#E6EAF2] text-[22px] font-bold">Lumen</Text>
            <Pressable onPress={() => router.push("/(tabs)/profile")}>
              <HStack className="items-center" space="sm">
                <Box
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 100,
                    backgroundColor: `${tier.color}22`,
                    borderWidth: 1,
                    borderColor: `${tier.color}66`,
                  }}
                >
                  <Text
                    style={{ color: tier.color, fontSize: 11, fontWeight: "700" }}
                  >
                    {tier.name}
                  </Text>
                </Box>
                <Text className="text-[#AAB0C0] text-[13px]">
                  {t("tabs.home.level", { level })}
                </Text>
              </HStack>
            </Pressable>
          </HStack>
          <Box className="h-[3px] bg-[#1A2233] rounded-full mt-2 overflow-hidden">
            <Box
              className="h-full"
              style={{
                width: `${Math.min(xpPct * 100, 100)}%`,
                backgroundColor: tier.color,
              }}
            />
          </Box>
        </Box>

        {/* Title + streak */}
        <Box className="px-6 pt-5">
          <Text className="text-[#E6EAF2] text-[22px] font-semibold">
            {t("tabs.home.title")}
          </Text>
          {streak > 0 && (
            <Box className="mt-3">
              <StreakCard streak={streak} shields={shields} />
            </Box>
          )}
        </Box>

        {/* Due cards badge */}
        {dueCardCount > 0 && (
          <Box className="px-6 mt-4">
            <TouchableOpacity
              onPress={() => router.push("/(session)/review")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#0D1025",
                borderWidth: 1,
                borderColor: "#7B8FE044",
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <HStack className="items-center" space="sm">
                <Text style={{ fontSize: 20 }}>🧠</Text>
                <VStack>
                  <Text style={{ color: "#7B8FE0", fontSize: 13, fontWeight: "700" }}>
                    {t("tabs.home.review_due", { count: dueCardCount })}
                  </Text>
                </VStack>
              </HStack>
              <Text style={{ color: "#7B8FE0", fontSize: 13, fontWeight: "600" }}>
                {t("tabs.home.start_review")} →
              </Text>
            </TouchableOpacity>
          </Box>
        )}

        {/* Explore new tracks — shown when all selected content is done */}
        {allContentDone && (
          <Box className="px-6 mt-4">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#160D20",
                borderWidth: 1,
                borderColor: "#C47AE044",
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <HStack className="items-center" space="sm">
                <Text style={{ fontSize: 20 }}>🗺️</Text>
                <VStack>
                  <Text style={{ color: "#C47AE0", fontSize: 13, fontWeight: "700" }}>
                    {t("tabs.home.explore_tracks_title")}
                  </Text>
                  <Text style={{ color: "#7B8193", fontSize: 12, marginTop: 1 }}>
                    {t("tabs.home.explore_tracks_subtitle")}
                  </Text>
                </VStack>
              </HStack>
              <Text style={{ color: "#C47AE0", fontSize: 13, fontWeight: "600" }}>
                {t("tabs.home.explore_tracks_cta")}
              </Text>
            </TouchableOpacity>
          </Box>
        )}

        {/* Retry recommendation — low quiz score */}
        {retryRecommendation && (() => {
          const meta = getLessonMeta(retryRecommendation.contentId);
          if (!meta || retryRecommendation.contentId === todayLessonId) return null;
          const pct = Math.round(retryRecommendation.quizScore * 100);
          return (
            <Box className="px-6 mt-4">
              <TouchableOpacity
                onPress={() => startSession(retryRecommendation.contentId)}
                style={{
                  backgroundColor: "#0E1A12",
                  borderWidth: 1,
                  borderColor: "#5ED19A33",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ color: "#5ED19A", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  {t("tabs.home.retry_title")}
                </Text>
                <HStack className="items-center justify-between">
                  <VStack style={{ flex: 1 }}>
                    <Text style={{ color: "#E6EAF2", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                      {meta.title[lang] ?? meta.title.en}
                    </Text>
                    <Text style={{ color: "#7B8193", fontSize: 12, marginTop: 2 }}>
                      {t("tabs.home.retry_score", { pct })}
                    </Text>
                  </VStack>
                  <Text style={{ color: "#5ED19A", fontSize: 13, fontWeight: "700", marginLeft: 12 }}>
                    {t("tabs.home.retry_cta")} →
                  </Text>
                </HStack>
              </TouchableOpacity>
            </Box>
          );
        })()}

        {/* Daily missions */}
        {missions.length > 0 && (
          <Box className="px-6 mt-4">
            <MissionsCard missions={missions} />
          </Box>
        )}

        {/* Today's lesson */}
        {loadingUser && (
          <Box className="px-6 mt-5">
            <SkeletonCard />
          </Box>
        )}
        {!loadingUser && todayLesson && todayLessonId && (() => {
          const isDone = todayCompletedId === todayLessonId;
          return (
            <Box className="px-6 mt-5">
              <HStack className="items-center justify-between mb-2">
                <Text className="text-[#AAB0C0] text-[11px] font-semibold tracking-widest">
                  {t("tabs.home.pack_of_day").toUpperCase()}
                </Text>
                {isDone && (
                  <HStack className="items-center" space="xs">
                    <Ionicons name="checkmark-circle" size={14} color="#5ED19A" />
                    <Text className="text-[#5ED19A] text-[11px] font-semibold">
                      {t("tabs.home.done_today")}
                    </Text>
                  </HStack>
                )}
              </HStack>
              <LumenCard>
                <VStack space="md">
                  <Text className="text-[#E6EAF2] text-[20px] font-semibold">
                    {todayLesson.title[lang] ?? todayLesson.title.en}
                  </Text>
                  <Text className="text-[#AAB0C0] text-[13px]">
                    {todayLesson.estimatedMinutes} min
                  </Text>
                  {isDone ? (
                    <LumenButton onPress={() => startSession(todayLessonId)} variant="ghost">
                      {t("tabs.home.redo")}
                    </LumenButton>
                  ) : (
                    <LumenButton onPress={() => startSession(todayLessonId)}>
                      {t("tabs.home.start")}
                    </LumenButton>
                  )}
                </VStack>
              </LumenCard>
            </Box>
          );
        })()}

        {/* Next lesson per other selected track */}
        {!loadingUser &&
          selectedTrackIds
            .filter((trackId) => trackId !== todayLesson?.trackId)
            .map((trackId) => {
              const lessonId = nextPerTrack[trackId];
              if (!lessonId) return null;
              const meta = getLessonMeta(lessonId);
              if (!meta) return null;
              return (
                <Box key={trackId} className="px-6 mt-3">
                  <LumenCard>
                    <VStack space="md">
                      <Text className="text-[#E6EAF2] text-[18px] font-semibold">
                        {meta.title[lang] ?? meta.title.en}
                      </Text>
                      <LumenButton onPress={() => startSession(lessonId)}>
                        {t("tabs.home.start")}
                      </LumenButton>
                    </VStack>
                  </LumenCard>
                </Box>
              );
            })}

        {/* Weekly progress */}
        {weeklyData.length > 0 && (
          <Box className="px-6 mt-6">
            <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
              {t("tabs.home.thisWeek")}
            </Text>
            <WeeklyCard
              data={weeklyData}
              goalMin={user?.dailyGoalMin ?? 10}
              lang={lang}
              studiedLabel={t("tabs.home.studied")}
            />
          </Box>
        )}
      </ScrollView>
    </>
  );
}
