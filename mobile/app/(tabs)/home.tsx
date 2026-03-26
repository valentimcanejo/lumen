import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { SkeletonCard } from "../../components/ui/lumen/Skeleton";
import { trackColor } from "../../constants/tracks";

import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import {
  getLessonMeta,
  pickNextLesson,
  getNextLessonPerTrack,
  getLessonCountForTrack,
} from "../../repositories/lessons.repo";
import {
  getWeeklyData,
  getTodaySession,
  getDueCardCount,
  getRecentSessions,
  grantComebackShield,
  type DayData,
} from "../../repositories/progress.repo";
import { invalidateUserCache } from "../../hooks/useUser";
import {
  requestNotificationPermission,
  scheduleDailyMissionNotification,
} from "../../services/notifications.service";
import { getCompletedContentIds } from "../../repositories/user.repo";
import { getTodayMissions, getWeeklyMissions } from "../../repositories/missions.repo";
import type { DailyMission, WeeklyMission } from "../../models/user";
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
// Weekly missions card
// ---------------------------------------------------------------------------

function WeeklyMissionsCard({ missions }: { missions: WeeklyMission[] }) {
  const { t } = useTranslation();
  return (
    <View style={wm.card}>
      <Text style={wm.title}>{t("missions.weekly_title")}</Text>
      {missions.map((m) => {
        const pct = m.target > 0 ? Math.min(m.progress / m.target, 1) : 0;
        return (
          <View key={m.id} style={wm.row}>
            <View style={wm.labelRow}>
              <Text style={[wm.label, m.completed && wm.labelDone]}>
                {t(`missions.weekly_${m.id}`)}
              </Text>
              <Text style={[wm.xpPill, m.completed && wm.xpPillDone]}>
                +{m.xpReward} XP
              </Text>
            </View>
            <View style={wm.barBg}>
              <View style={[wm.barFill, { width: `${pct * 100}%`, backgroundColor: m.completed ? "#5ED19A" : "#F5C77A" }]} />
            </View>
            <Text style={wm.progress}>
              {m.completed ? "✓" : `${m.progress}/${m.target}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const wm = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  title: {
    color: "#AAB0C0",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  row: { gap: 6 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: "#AAB0C0", fontSize: 13, flex: 1, marginRight: 8 },
  labelDone: { color: "#4A5568", textDecorationLine: "line-through" },
  xpPill: { color: "#F5C77A", fontSize: 12, fontWeight: "700" },
  xpPillDone: { color: "#2A4030" },
  barBg: {
    height: 4,
    backgroundColor: "#1A2233",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 2 },
  progress: { color: "#7B8193", fontSize: 11, textAlign: "right" },
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
  const [loadingUser, setLoadingUser] = useState(true);
  const [todayCompletedId, setTodayCompletedId] = useState<string | null>(null);
  const [dueCardCount, setDueCardCount] = useState(0);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [retryRecommendation, setRetryRecommendation] = useState<{
    contentId: string; quizScore: number;
  } | null>(null);
  const [comebackShield, setComebackShield] = useState(false);
  const comebackCheckedRef = useRef(false);
  const notifScheduledRef = useRef(false);

  // Flame pulse animation for streak pill
  const flameScale = useSharedValue(1);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flameScale.value }] }));

  useFocusEffect(
    useCallback(() => {
      if (!currentUserId) return;
      setLoadingUser(true);
      getUserData({ userId: currentUserId })
        .then((u) => {
          setUser(u ?? null);
          // Comeback mechanic — 3+ days absent → grant shield once per app session
          if (!comebackCheckedRef.current && u?.streak?.lastStudyDate) {
            const today = new Date().toISOString().slice(0, 10);
            const last = new Date(u.streak.lastStudyDate).getTime();
            const daysSince = Math.floor((Date.now() - last) / 86_400_000);
            if (daysSince >= 3 && today !== u.streak.lastStudyDate) {
              comebackCheckedRef.current = true;
              setComebackShield(true);
              grantComebackShield(currentUserId)
                .then(() => invalidateUserCache(currentUserId))
                .catch(() => {});
            }
          }
        })
        .finally(() => setLoadingUser(false));

      // Schedule daily mission notification (idempotent — replaces itself daily)
      if (!notifScheduledRef.current) {
        notifScheduledRef.current = true;
        requestNotificationPermission().then((granted) => {
          if (granted) {
            scheduleDailyMissionNotification(
              "📋 Suas missões de hoje estão prontas!",
              "Complete suas missões diárias e ganhe XP bônus.",
            ).catch(() => {});
          }
        });
      }
      getWeeklyData(currentUserId).then(setWeeklyData).catch(() => {});
      getTodaySession(currentUserId)
        .then((s) => setTodayCompletedId(s?.contentId ?? null))
        .catch(() => {});
      getDueCardCount(currentUserId).then(setDueCardCount).catch(() => {});
      getCompletedContentIds(currentUserId).then(setCompletedIds).catch(() => {});
      getTodayMissions(currentUserId).then(setMissions).catch(() => {});
      getWeeklyMissions(currentUserId).then(setWeeklyMissions).catch(() => {});
      getRecentSessions(currentUserId).then((sessions) => {
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
    }, [currentUserId]),
  );

  const lang = (user?.lang ?? i18n.language ?? "pt") as Lang;
  const streak = user?.streak?.current ?? 0;

  useEffect(() => {
    if (streak > 0) {
      flameScale.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        true,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);
  const shields = user?.streak?.shields ?? 0;
  const xp = user?.xp ?? 0;
  const level = xpToLevel(xp);
  const tier = getLevelTier(level);
  const xpFloor = levelXpThreshold(level);
  const xpCeil = xpForNextLevel(level);
  const xpPct = xpCeil > xpFloor ? (xp - xpFloor) / (xpCeil - xpFloor) : 1;

  // Backward-compat: fall back to selectedGoalIds for users who haven't migrated
  const selectedTrackIds = user?.selectedTrackIds ?? user?.selectedGoalIds ?? [];
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
    <ScrollView
      className="flex-1 bg-[#0B0F14]"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header: logo + streak pill | tier + level */}
      <Box className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center justify-between">
          <HStack className="items-center" style={{ gap: 10 }}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
            <Text className="text-[#E6EAF2] text-[22px] font-bold">Lumen</Text>
            {streak > 0 && (
              <View style={hd.streakPill}>
                <Animated.Text style={[{ fontSize: 14 }, flameStyle]}>🔥</Animated.Text>
                <Text style={hd.streakNum}>{streak}</Text>
                {shields > 0 && <Text style={hd.streakShield}>🛡️{shields}</Text>}
              </View>
            )}
          </HStack>
          <Pressable onPress={() => router.push("/(tabs)/profile")}>
            <HStack className="items-center" space="sm">
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: `${tier.color}22`, borderWidth: 1, borderColor: `${tier.color}66` }}>
                <Text style={{ color: tier.color, fontSize: 11, fontWeight: "700" }}>{tier.name}</Text>
              </View>
              <Text className="text-[#AAB0C0] text-[13px]">{t("tabs.home.level", { level })}</Text>
            </HStack>
          </Pressable>
        </HStack>
        <View style={{ height: 3, backgroundColor: "#1A2233", borderRadius: 99, marginTop: 10, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${Math.min(xpPct * 100, 100)}%`, backgroundColor: tier.color, borderRadius: 99 }} />
        </View>
      </Box>

      {/* ── Comeback banner ────────────────────────────────────── */}
      {comebackShield && (
        <Box className="px-6 mt-4">
          <View style={cb.card}>
            <View style={cb.iconWrap}>
              <Text style={{ fontSize: 22 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cb.title}>Bem-vindo de volta!</Text>
              <Text style={cb.body}>
                Sentimos sua falta. Ganhamos um shield para proteger sua sequência.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setComebackShield(false)} style={cb.close}>
              <Ionicons name="close" size={16} color="#7B8193" />
            </TouchableOpacity>
          </View>
        </Box>
      )}

      {/* ── Lições ─────────────────────────────────────────────── */}
      {loadingUser && (
        <Box className="px-6 mt-5">
          <SkeletonCard />
        </Box>
      )}

      {!loadingUser && todayLesson && todayLessonId && (() => {
        const isDone = todayCompletedId === todayLessonId;
        const color = trackColor(todayLesson.trackId);
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
            <TouchableOpacity onPress={() => startSession(todayLessonId)} style={lc.card} activeOpacity={0.75}>
              <View style={[lc.trackAccent, { backgroundColor: color }]} />
              <VStack style={{ flex: 1, marginRight: 12 }}>
                <Text style={lc.cardTitle} numberOfLines={2}>
                  {todayLesson.title[lang] ?? todayLesson.title.en}
                </Text>
                <Text style={lc.cardDuration}>{todayLesson.estimatedMinutes} min</Text>
              </VStack>
              <View style={[lc.startBtn, isDone && lc.startBtnDone]}>
                <Text style={[lc.startBtnText, isDone && lc.startBtnTextDone]}>
                  {isDone ? t("tabs.home.redo") : t("tabs.home.start")}
                </Text>
              </View>
            </TouchableOpacity>
          </Box>
        );
      })()}

      {!loadingUser && (() => {
        const otherRows = selectedTrackIds
          .filter((trackId) => trackId !== todayLesson?.trackId)
          .map((trackId) => {
            const lessonId = nextPerTrack[trackId];
            if (!lessonId) return null;
            const meta = getLessonMeta(lessonId);
            if (!meta) return null;
            return { trackId, lessonId, meta };
          })
          .filter(Boolean) as { trackId: string; lessonId: string; meta: ReturnType<typeof getLessonMeta> & {} }[];

        if (otherRows.length === 0) return null;
        return (
          <Box className="px-6 mt-3">
            <View style={lc.listContainer}>
              {otherRows.map(({ trackId, lessonId, meta }, index) => {
                const color = trackColor(trackId);
                return (
                  <React.Fragment key={trackId}>
                    {index > 0 && <View style={lc.divider} />}
                    <TouchableOpacity onPress={() => startSession(lessonId)} style={lc.row} activeOpacity={0.7}>
                      <View style={[lc.trackDot, { backgroundColor: color }]} />
                      <VStack style={{ flex: 1 }}>
                        <Text style={lc.rowTitle} numberOfLines={1}>{meta!.title[lang] ?? meta!.title.en}</Text>
                        {(() => {
                          const total = getLessonCountForTrack(trackId);
                          const done = completedIds.filter((id) => id.startsWith(trackId)).length;
                          const pct = total > 0 ? done / total : 0;
                          return (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                              <View style={{ flex: 1, height: 2, backgroundColor: "#1A2233", borderRadius: 1, overflow: "hidden" }}>
                                <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, borderRadius: 1 }} />
                              </View>
                              <Text style={{ color: done > 0 ? color : "#4A5568", fontSize: 10, fontWeight: "600" }}>{done}/{total}</Text>
                            </View>
                          );
                        })()}
                      </VStack>
                      <Ionicons name="chevron-forward" size={16} color="#4A5568" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </Box>
        );
      })()}

      {!loadingUser && (
        <Box className="px-6 mt-2">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/tracks")}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 6 }}
            activeOpacity={0.6}
          >
            <Ionicons name="add-circle-outline" size={15} color="#4A5568" />
            <Text style={{ color: "#4A5568", fontSize: 12, fontWeight: "600" }}>
              {t("tabs.home.manage_tracks")}
            </Text>
          </TouchableOpacity>
        </Box>
      )}

      {/* ── Ações secundárias ──────────────────────────────────── */}
      {dueCardCount > 0 && (
        <Box className="px-6 mt-4">
          <TouchableOpacity
            onPress={() => router.push("/(session)/review")}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0D1025", borderWidth: 1, borderColor: "#7B8FE044", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <HStack className="items-center" space="sm">
              <Text style={{ fontSize: 18 }}>🧠</Text>
              <VStack>
                <Text style={{ color: "#7B8FE0", fontSize: 13, fontWeight: "700" }}>
                  {t("tabs.home.review_due", { count: dueCardCount })}
                </Text>
                {missions.some((m) => m.id === "review_cards" && !m.completed) && (
                  <Text style={{ color: "#7B8FE077", fontSize: 11, marginTop: 1 }}>
                    {t("missions.review_cards")} · +{missions.find((m) => m.id === "review_cards")?.xpReward} XP
                  </Text>
                )}
              </VStack>
            </HStack>
            <Text style={{ color: "#7B8FE0", fontSize: 13, fontWeight: "600" }}>
              {t("tabs.home.start_review")} →
            </Text>
          </TouchableOpacity>
        </Box>
      )}

      {retryRecommendation && (() => {
        const meta = getLessonMeta(retryRecommendation.contentId);
        if (!meta || retryRecommendation.contentId === todayLessonId) return null;
        const pct = Math.round(retryRecommendation.quizScore * 100);
        return (
          <Box className="px-6 mt-3">
            <TouchableOpacity
              onPress={() => startSession(retryRecommendation.contentId)}
              style={{ backgroundColor: "#0E1A12", borderWidth: 1, borderColor: "#5ED19A33", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13 }}
            >
              <Text style={{ color: "#5ED19A", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>
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

      {/* ── Missões ────────────────────────────────────────────── */}
      {missions.length > 0 && (
        <Box className="px-6 mt-4">
          <MissionsCard missions={missions} />
        </Box>
      )}

      {/* ── Missões semanais ───────────────────────────────────── */}
      {weeklyMissions.length > 0 && (
        <Box className="px-6 mt-4">
          <WeeklyMissionsCard missions={weeklyMissions} />
        </Box>
      )}

      {/* ── Semana ─────────────────────────────────────────────── */}
      {weeklyData.length > 0 && (
        <Box className="px-6 mt-5">
          <WeeklyCard
            data={weeklyData}
            goalMin={user?.dailyGoalMin ?? 10}
            lang={lang}
            studiedLabel={t("tabs.home.studied")}
          />
        </Box>
      )}

      {/* ── Leaderboard ────────────────────────────────────────── */}
      <Box className="px-6 mt-4 mb-6">
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/leaderboard")}
          style={{
            backgroundColor: "#121826",
            borderWidth: 1,
            borderColor: "#7B8FE033",
            borderRadius: 18,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#7B8FE022", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#E6EAF2", fontSize: 14, fontWeight: "700" }}>
              {t("leaderboard.title")}
            </Text>
            <Text style={{ color: "#7B8193", fontSize: 12, marginTop: 1 }}>
              {t("leaderboard.home_sub")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#4A5568" />
        </TouchableOpacity>
      </Box>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Header streak pill styles
// ---------------------------------------------------------------------------

const cb = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#7B8FE044",
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7B8FE018",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#E6EAF2",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  body: {
    color: "#7B8193",
    fontSize: 12,
    lineHeight: 17,
  },
  close: { padding: 4 },
});

const hd = StyleSheet.create({
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A120A",
    borderWidth: 1,
    borderColor: "#F5C77A33",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  streakNum: { color: "#F5C77A", fontSize: 13, fontWeight: "800" },
  streakShield: { color: "#7B8FE0", fontSize: 12, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Lesson card styles
// ---------------------------------------------------------------------------

const lc = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  trackAccent: {
    width: 3,
    height: 40,
    borderRadius: 2,
    marginRight: 14,
  },
  cardTitle: {
    color: "#E6EAF2",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginBottom: 4,
  },
  cardDuration: {
    color: "#7B8193",
    fontSize: 12,
  },
  startBtn: {
    backgroundColor: "#F5C77A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnDone: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2A3448",
  },
  startBtnText: {
    color: "#0B0F14",
    fontSize: 13,
    fontWeight: "700",
  },
  startBtnTextDone: {
    color: "#7B8193",
  },
  listContainer: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 18,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A2233",
    marginHorizontal: 16,
  },
  trackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowTitle: {
    color: "#E6EAF2",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowDuration: {
    color: "#7B8193",
    fontSize: 12,
  },
});
