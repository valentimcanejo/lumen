import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Image,
  Modal,
  useWindowDimensions,
} from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { SkeletonCard } from "../../components/ui/lumen/Skeleton";
import { trackColor } from "../../constants/tracks";
import { getCoverImage } from "../../constants/covers";
import { CoverImage } from "../../components/ui/lumen/CoverImage";

import { useUser } from "../../hooks/useUser";
import { usePremium } from "../../hooks/usePremium";
import { useAuth } from "../../hooks/useAuth";
import {
  getLessonMeta,
  pickNextLesson,
  getNextLessonPerTrack,
  getLessonCountForTrack,
} from "../../repositories/lessons.repo";
import { getBundledGoals } from "../../repositories/goals.repo";

import {
  getWeeklyData,
  getTodaySession,
  getDueCardCount,
  getRecentSessions,
  type DayData,
} from "../../repositories/progress.repo";
import { invalidateUserCache } from "../../hooks/useUser";
import {
  scheduleDailyMissionNotification,
} from "../../services/notifications.service";
import * as Notifications from "expo-notifications";
import { getCompletedContentIds } from "../../repositories/user.repo";
import { getLatestInsights } from "../../repositories/insights.repo";
import type { KnowledgeInsight } from "../../models/insight";
import { getCurrentWeekId } from "../../repositories/leaderboard.repo";
import { WeeklyShareCard } from "../../components/WeeklyShareCard";
import { FEATURES } from "../../constants/config";
import { getTodayMissions, getWeeklyMissions } from "../../repositories/missions.repo";
import type { DailyMission, WeeklyMission } from "../../models/user";
import { todayYmd } from "../../repositories/session.repo";
import {
  type UserProfile,
  type StarterChallenge,
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
      <Text style={ms.eyebrow}>{t("missions.title")}</Text>
      {missions.map((m) => (
        <View key={m.id} style={[ms.row, m.completed && ms.rowDone]}>
          <View style={[ms.check, m.completed && ms.checkDone]}>
            {m.completed && (
              <Ionicons name="checkmark" size={11} color="#0B0F14" />
            )}
          </View>
          <Text style={[ms.missionLabel, m.completed && ms.missionLabelDone]}>
            {t(`missions.${m.id}`)}
          </Text>
          <View style={[ms.xpBadge, m.completed && ms.xpBadgeDone]}>
            <Text style={[ms.xpText, m.completed && ms.xpTextDone]}>
              +{m.xpReward} XP
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  eyebrow: {
    color: "#4A5568",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0E1420",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDone: {
    backgroundColor: "transparent",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#2A3448",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkDone: {
    backgroundColor: "#5ED19A",
    borderColor: "#5ED19A",
  },
  missionLabel: {
    flex: 1,
    color: "#C8CDD8",
    fontSize: 13,
    fontWeight: "500",
  },
  missionLabelDone: {
    color: "#3A4558",
    textDecorationLine: "line-through",
  },
  xpBadge: {
    backgroundColor: "#162618",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#5ED19A30",
    flexShrink: 0,
  },
  xpBadgeDone: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  xpText: {
    color: "#5ED19A",
    fontSize: 11,
    fontWeight: "700",
  },
  xpTextDone: {
    color: "#273327",
  },
});

// ---------------------------------------------------------------------------
// Weekly missions card
// ---------------------------------------------------------------------------

function WeeklyMissionsCard({ missions }: { missions: WeeklyMission[] }) {
  const { t } = useTranslation();
  return (
    <View style={wm.card}>
      <Text style={wm.eyebrow}>{t("missions.weekly_title")}</Text>
      {missions.map((m) => {
        const pct = m.target > 0 ? Math.min(m.progress / m.target, 1) : 0;
        return (
          <View key={m.id} style={wm.item}>
            <View style={wm.labelRow}>
              <Text style={[wm.label, m.completed && wm.labelDone]}>
                {t(`missions.weekly_${m.id}`)}
              </Text>
              <View style={[wm.xpBadge, m.completed && wm.xpBadgeDone]}>
                <Text style={[wm.xpText, m.completed && wm.xpTextDone]}>
                  +{m.xpReward} XP
                </Text>
              </View>
            </View>
            <View style={wm.barBg}>
              <View
                style={[
                  wm.barFill,
                  {
                    width: `${pct * 100}%`,
                    backgroundColor: m.completed ? "#5ED19A" : "#F5C77A",
                  },
                ]}
              />
            </View>
            <Text style={wm.progress}>
              {m.completed ? "✓" : `${m.progress} / ${m.target}`}
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
    borderColor: "#1E2A3E",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    color: "#4A5568",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  item: { gap: 7 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: "#AAB0C0", fontSize: 13, fontWeight: "500", flex: 1, marginRight: 8 },
  labelDone: { color: "#3A4558", textDecorationLine: "line-through" },
  xpBadge: {
    backgroundColor: "#1A2614",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#F5C77A30",
    flexShrink: 0,
  },
  xpBadgeDone: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  xpText: { color: "#F5C77A", fontSize: 11, fontWeight: "700" },
  xpTextDone: { color: "#2A3018" },
  barBg: {
    height: 4,
    backgroundColor: "#0E1420",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  progress: { color: "#3A4558", fontSize: 11, fontWeight: "600", textAlign: "right" },
});

// ---------------------------------------------------------------------------
// Starter challenge card — shown to new users until 3 study days completed
// ---------------------------------------------------------------------------

const STARTER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function StarterChallengeCard({
  challenge,
  createdAt,
}: {
  challenge: StarterChallenge | undefined;
  createdAt: number;
}) {
  const { t } = useTranslation();
  const daysCompleted = challenge?.studyDates.length ?? 0;
  const bonusGranted = challenge?.bonusGranted ?? false;

  // Only show for accounts < 30 days old that haven't completed yet
  if (bonusGranted) return null;
  if (Date.now() - createdAt > STARTER_WINDOW_MS) return null;

  const days = [
    t("starter.day", { n: 1 }),
    t("starter.day", { n: 2 }),
    t("starter.day", { n: 3 }),
  ];

  return (
    <View style={sc.card}>
      <View style={sc.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={sc.eyebrow}>{t("starter.subtitle")}</Text>
          <Text style={sc.title}>{t("starter.title")}</Text>
        </View>
        <View style={sc.bonusPill}>
          <Text style={sc.bonusText}>+50 XP</Text>
        </View>
      </View>
      <View style={sc.daysRow}>
        {days.map((label, i) => {
          const done = i < daysCompleted;
          const current = i === daysCompleted;
          const isLast = i === days.length - 1;
          return (
            <React.Fragment key={i}>
              <View style={sc.dayItem}>
                <View style={[sc.dayCircle, done && sc.dayCircleDone, current && sc.dayCircleCurrent]}>
                  {done
                    ? <Ionicons name="checkmark" size={20} color="#0B0F14" />
                    : <Text style={[sc.dayNum, current && sc.dayNumCurrent]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[sc.dayLabel, done && sc.dayLabelDone, current && sc.dayLabelCurrent]}>{label}</Text>
              </View>
              {!isLast && (
                <View style={[sc.connector, done && sc.connectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#F5C77A18",
    borderRadius: 24,
    padding: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#4A5568",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: { color: "#E6EAF2", fontSize: 16, fontWeight: "700" },
  bonusPill: {
    backgroundColor: "#F5C77A15",
    borderWidth: 1,
    borderColor: "#F5C77A50",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bonusText: { color: "#F5C77A", fontSize: 12, fontWeight: "800" },
  daysRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  dayItem: { alignItems: "center", gap: 8 },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: "#1E2A3E",
    marginBottom: 26,
    marginHorizontal: 4,
  },
  connectorDone: { backgroundColor: "#5ED19A60" },
  dayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0E1420",
    borderWidth: 2,
    borderColor: "#1E2A3E",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleDone: { backgroundColor: "#5ED19A", borderColor: "#5ED19A" },
  dayCircleCurrent: { borderColor: "#F5C77A", backgroundColor: "#F5C77A0D" },
  dayNum: { color: "#3A4558", fontSize: 18, fontWeight: "800" },
  dayNumCurrent: { color: "#F5C77A" },
  dayLabel: { color: "#3A4558", fontSize: 11, fontWeight: "600" },
  dayLabelDone: { color: "#5ED19A" },
  dayLabelCurrent: { color: "#F5C77A" },
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
    borderColor: "#1E2A3E",
    borderRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  eyebrow: {
    color: "#4A5568",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  minutesNum: { color: "#F5C77A", fontSize: 34, fontWeight: "800", lineHeight: 38 },
  minutesUnit: { color: "#7B8193", fontSize: 15, marginBottom: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5C77A15",
    borderWidth: 1,
    borderColor: "#F5C77A44",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { color: "#F5C77A", fontSize: 12, fontWeight: "700" },
  daysRow: {
    flexDirection: "row",
    marginBottom: 22,
  },
  dayCol: { alignItems: "center", gap: 8 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dayLabel: { fontSize: 11, fontWeight: "700" },
  barTrack: {
    height: 4,
    backgroundColor: "#0E1420",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  barFill: { height: "100%", borderRadius: 3 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsText: { color: "#3A4558", fontSize: 11, fontWeight: "600" },
});

function WeeklyCard({
  data,
  goalMin,
  lang,
  studiedLabel,
  screenWidth,
}: {
  data: DayData[];
  goalMin: number;
  lang: string;
  studiedLabel: string;
  screenWidth: number;
}) {
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;
  const labels = DAY_LABELS[lang] ?? DAY_LABELS.en;
  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const weekGoal = goalMin * 7;
  const weekPct = weekGoal > 0 ? Math.min(totalMinutes / weekGoal, 1) : 0;
  const weekDone = weekPct >= 1;
  // outer paddingH 20 + card padding 20 = 40px each side; 6 gaps of 4px
  const circleSize = Math.floor((screenWidth - 80 - 24) / 7);

  return (
    <View style={wk.card}>
      {/* Header */}
      <View style={wk.headerRow}>
        <View>
          <Text style={wk.eyebrow}>{studiedLabel}</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5 }}>
            <Text style={wk.minutesNum}>{totalMinutes}</Text>
            <Text style={wk.minutesUnit}>min</Text>
          </View>
        </View>
        {weekDone && (
          <View style={wk.badge}>
            <Ionicons name="trophy" size={12} color="#F5C77A" />
            <Text style={wk.badgeText}>Meta!</Text>
          </View>
        )}
      </View>

      {/* Day circles */}
      <View style={[wk.daysRow, { gap: 4 }]}>
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
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleSize / 2,
                    backgroundColor: done
                      ? "#F5C77A"
                      : isToday
                        ? "#F5C77A0E"
                        : "#0E1420",
                    borderWidth: isToday && !done ? 1.5 : 0,
                    borderColor: "#F5C77A66",
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color="#0B0F14" />
                ) : isToday ? (
                  <View style={[wk.dot, { backgroundColor: "#F5C77A" }]} />
                ) : isFuture ? null : (
                  <View
                    style={[wk.dot, { backgroundColor: "#2A3448", width: 5, height: 5, borderRadius: 3 }]}
                  />
                )}
              </View>
              <Text
                style={[
                  wk.dayLabel,
                  { color: isToday ? "#F5C77A" : done ? "#7B8193" : "#2A3448" },
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
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { uid: currentUserId } = useAuth();
  const { getUserData } = useUser();
  const trackTitles = useMemo(
    () => Object.fromEntries(getBundledGoals().map((g) => [g.id, g.title])),
    [],
  );
  const { isPremium } = usePremium();

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
  const notifScheduledRef = useRef(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const shareCheckedRef = useRef(false);
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [latestInsight, setLatestInsight] = useState<KnowledgeInsight | null>(null);

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
        })
        .finally(() => setLoadingUser(false));

      // Schedule daily mission notification (idempotent — replaces itself daily)
      if (!notifScheduledRef.current) {
        notifScheduledRef.current = true;
        Notifications.getPermissionsAsync().then(({ status }) => {
          if (status === "granted") {
            scheduleDailyMissionNotification(
              t("notifications.daily_mission_title"),
              t("notifications.daily_mission_body"),
            ).catch(() => {});
          }
        });
      }
      getWeeklyData(currentUserId).then((data) => {
        setWeeklyData(data);
        if (!shareCheckedRef.current && new Date().getDay() === 0) {
          shareCheckedRef.current = true;
          const daysStudied = data.filter((d) => d.minutes > 0).length;
          if (daysStudied >= 3) {
            const weekId = getCurrentWeekId();
            AsyncStorage.getItem(`weeklyShareShown_${weekId}`).then((shown) => {
              if (!shown) setShowShareModal(true);
            }).catch(() => {});
          }
        }
      }).catch(() => {});
      getTodaySession(currentUserId)
        .then((s) => setTodayCompletedId(s?.contentId ?? null))
        .catch(() => {});
      getDueCardCount(currentUserId).then(setDueCardCount).catch(() => {});
      getCompletedContentIds(currentUserId).then(setCompletedIds).catch(() => {});
      getTodayMissions(currentUserId).then(setMissions).catch(() => {});
      getWeeklyMissions(currentUserId).then(setWeeklyMissions).catch(() => {});
      getLatestInsights(currentUserId, 1).then((arr) => setLatestInsight(arr[0] ?? null)).catch(() => {});
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

  const lang = (["pt", "en", "es"].includes(i18n.language) ? i18n.language : user?.lang ?? "pt") as Lang;
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

  async function handleShare() {
    if (!viewShotRef.current) return;
    setSharing(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartilhar resultado semanal" });
        const weekId = getCurrentWeekId();
        await AsyncStorage.setItem(`weeklyShareShown_${weekId}`, "1");
        setShowShareModal(false);
      }
    } catch {
      // user cancelled or error — silent
    } finally {
      setSharing(false);
    }
  }

  function dismissShareModal() {
    const weekId = getCurrentWeekId();
    AsyncStorage.setItem(`weeklyShareShown_${weekId}`, "1").catch(() => {});
    setShowShareModal(false);
  }

  function startSession(contentId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    {/* Weekly share modal */}
    {FEATURES.WEEKLY_SHARE && <Modal visible={showShareModal} transparent animationType="fade" onRequestClose={dismissShareModal}>
      <View style={sh.overlay}>
        <View style={sh.sheet}>
          <Text style={sh.sheetTitle}>Sua semana em resumo 🎉</Text>
          <Text style={sh.sheetSub}>Compartilhe seu resultado com quem você conhece.</Text>

          <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
            <WeeklyShareCard data={weeklyData} streak={streak} lang={lang} />
          </ViewShot>

          <TouchableOpacity
            style={[sh.shareBtn, sharing && { opacity: 0.6 }]}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={18} color="#0B0F14" />
            <Text style={sh.shareBtnText}>{sharing ? "Preparando…" : "Compartilhar"}</Text>
          </TouchableOpacity>

          <Pressable onPress={dismissShareModal}>
            <Text style={sh.dismiss}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>}

    <ScrollView
      style={{ flex: 1, backgroundColor: "#0B0F14" }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[hd.headerWrap, { paddingTop: insets.top + 10 }]}>
        {/* Top row: logo + streak | tier + level */}
        <View style={hd.topRow}>
          <View style={hd.logoGroup}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={hd.logoImg}
            />
            <Text style={hd.logoText}>Lumen</Text>
            {streak > 0 && (
              <View style={hd.streakPill}>
                <Animated.Text style={[{ fontSize: 14 }, flameStyle]}>🔥</Animated.Text>
                <Text style={hd.streakNum}>{streak}</Text>
                {shields > 0 && (
                  <View style={hd.shieldBadge}>
                    <Ionicons name="shield" size={9} color="#7B8FE0" />
                    <Text style={hd.shieldNum}>{shields}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <Pressable onPress={() => router.push("/(tabs)/profile")} style={hd.levelGroup}>
            <View style={[hd.tierPill, { backgroundColor: `${tier.color}18`, borderColor: `${tier.color}50` }]}>
              <Text style={[hd.tierText, { color: tier.color }]}>{tier.name}</Text>
            </View>
            <Text style={hd.levelText}>{t("tabs.home.level", { level })}</Text>
          </Pressable>
        </View>

{/* XP progress bar */}
        <View style={hd.xpBarTrack}>
          <View
            style={[
              hd.xpBarFill,
              { width: `${Math.min(xpPct * 100, 100)}%`, backgroundColor: tier.color },
            ]}
          />
        </View>
      </View>

      {/* ── Streak recovery banner ─────────────────────────────── */}
      {user?.streak?.recoverable && Date.now() < (user.streak.recoverableUntil ?? 0) && (
        <View style={hd.recoveryBanner}>
          <Text style={{ fontSize: 18 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={hd.recoveryTitle}>{t("tabs.home.streak_recovery_title")}</Text>
            <Text style={hd.recoverySubtitle}>
              {t("tabs.home.streak_recovery_subtitle", { count: 2 - (user.streak.recoverySessions ?? 0) })}
            </Text>
          </View>
        </View>
      )}

      {/* ── Lição de hoje ──────────────────────────────────────── */}
      {loadingUser && (
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <SkeletonCard />
        </View>
      )}

      {!loadingUser && todayLesson && todayLessonId && (() => {
        const isDone = todayCompletedId === todayLessonId;
        const color = trackColor(todayLesson.trackId);
        const coverUri = todayLesson.coverImageUrl;
        const coverLocal = getCoverImage(todayLessonId);
        return (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            {/* Section label */}
            <View style={lc.sectionHeader}>
              <Text style={lc.sectionLabel}>
                {t("tabs.home.pack_of_day").toUpperCase()}
              </Text>
              {isDone && (
                <View style={lc.donePill}>
                  <Ionicons name="checkmark-circle" size={12} color="#5ED19A" />
                  <Text style={lc.doneText}>{t("tabs.home.done_today")}</Text>
                </View>
              )}
            </View>

            {/* Hero card + CTA — unified container */}
            <View style={[lc.heroWrap, { borderColor: isDone ? "#1E2A3E" : color + "50" }]}>
              {/* Image */}
              <View style={lc.heroCard}>
                {FEATURES.COVER_IMAGES && coverUri ? (
                  <CoverImage
                    uri={coverUri}
                    credit={todayLesson.coverImageCredit}
                    width="100%"
                    height={210}
                  />
                ) : FEATURES.COVER_IMAGES && coverLocal ? (
                  <Image source={coverLocal} style={lc.heroImage} resizeMode="cover" />
                ) : (
                  <View style={[lc.heroImage, { backgroundColor: color + "18", alignItems: "center", justifyContent: "center" }]}>
                    <View style={{ width: 3, height: 48, backgroundColor: color, borderRadius: 2 }} />
                  </View>
                )}

                {/* Multi-layer scrim — simulates gradient */}
                <View style={lc.heroScrimMid} />
                <View style={lc.heroScrimBot} />

                {/* Done dim overlay */}
                {isDone && <View style={lc.doneDimOverlay} />}

                {/* Overlaid content */}
                <View style={lc.heroOverlay}>
                  <View style={[lc.trackPill, { backgroundColor: color + "25", borderColor: color + "55" }]}>
                    <Text style={[lc.trackPillText, { color }]}>
                      {trackTitles[todayLesson.trackId]?.[lang] ?? todayLesson.trackId.replace(/_/g, " ")}
                    </Text>
                  </View>
                  <Text style={lc.heroTitle} numberOfLines={2}>
                    {todayLesson.title[lang] ?? todayLesson.title.en}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Ionicons name="time-outline" size={12} color="#AAB0C0" />
                    <Text style={lc.heroDuration}>{todayLesson.estimatedMinutes} min</Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={[lc.heroCtaDivider, { backgroundColor: isDone ? "#1E2A3E" : color + "30" }]} />

              {/* CTA — attached to bottom of card */}
              <TouchableOpacity
                onPress={() => startSession(todayLessonId)}
                activeOpacity={0.82}
                style={[
                  lc.heroCta,
                  isDone ? lc.heroCtaDone : { backgroundColor: color + "18" },
                ]}
              >
                {!isDone && (
                  <Ionicons name="play" size={14} color={color} style={{ marginRight: 7 }} />
                )}
                <Text style={[lc.heroCtaText, { color: isDone ? "#4A5568" : color }]}>
                  {isDone ? t("tabs.home.redo") : t("tabs.home.start")}
                </Text>
                {isDone && (
                  <Ionicons name="refresh" size={14} color="#4A5568" style={{ marginLeft: 7 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* ── Outros tracks ──────────────────────────────────────── */}
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
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <View style={lc.listCard}>
              {otherRows.map(({ trackId, lessonId, meta }, index) => {
                const color = trackColor(trackId);
                const total = getLessonCountForTrack(trackId);
                const done = completedIds.filter((id) => id.startsWith(trackId)).length;
                const pct = total > 0 ? done / total : 0;
                return (
                  <React.Fragment key={trackId}>
                    {index > 0 && <View style={lc.listDivider} />}
                    <TouchableOpacity
                      onPress={() => startSession(lessonId)}
                      style={lc.listRow}
                      activeOpacity={0.7}
                    >
                      <View style={[lc.trackIcon, { backgroundColor: color + "18", borderColor: color + "35" }]}>
                        <Text style={[lc.trackIconLetter, { color }]}>
                          {trackId.replace(/_/g, " ").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <VStack style={{ flex: 1, gap: 2 }}>
                        <Text style={[lc.listRowEyebrow, { color }]}>
                          {trackTitles[trackId]?.[lang] ?? trackId.replace(/_/g, " ")}
                        </Text>
                        <Text style={lc.listRowTitle} numberOfLines={1}>
                          {meta!.title[lang] ?? meta!.title.en}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 }}>
                          <View style={{ flex: 1, height: 3, backgroundColor: "#0E1420", borderRadius: 2, overflow: "hidden" }}>
                            <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, borderRadius: 2 }} />
                          </View>
                          <Text style={{ color: done > 0 ? color : "#3A4558", fontSize: 10, fontWeight: "700" }}>
                            {done}/{total}
                          </Text>
                        </View>
                      </VStack>
                      <Ionicons name="chevron-forward" size={14} color="#3A4558" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        );
      })()}

      {!loadingUser && (
        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/tracks")}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 }}
            activeOpacity={0.6}
          >
            <Ionicons name="add-circle-outline" size={14} color="#3A4558" />
            <Text style={{ color: "#3A4558", fontSize: 12, fontWeight: "600" }}>
              {t("tabs.home.manage_tracks")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Revisão de cards ───────────────────────────────────── */}
      {dueCardCount > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => router.push("/(session)/review")}
            style={ab.reviewCard}
            activeOpacity={0.85}
          >
            <View style={ab.reviewIconWrap}>
              <Ionicons name="brain" size={18} color="#7B8FE0" />
            </View>
            <VStack style={{ flex: 1 }}>
              <Text style={ab.reviewTitle}>
                {t("tabs.home.review_due", { count: dueCardCount })}
              </Text>
              {missions.some((m) => m.id === "review_cards" && !m.completed) && (
                <Text style={ab.reviewSub}>
                  {t("missions.review_cards")} · +{missions.find((m) => m.id === "review_cards")?.xpReward} XP
                </Text>
              )}
            </VStack>
            <Text style={ab.reviewCta}>{t("tabs.home.start_review")} →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Retry recommendation ───────────────────────────────── */}
      {retryRecommendation && (() => {
        const meta = getLessonMeta(retryRecommendation.contentId);
        if (!meta || retryRecommendation.contentId === todayLessonId) return null;
        const pct = Math.round(retryRecommendation.quizScore * 100);
        return (
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => startSession(retryRecommendation.contentId)}
              style={ab.retryCard}
              activeOpacity={0.85}
            >
              <Text style={ab.retryEyebrow}>{t("tabs.home.retry_title")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <VStack style={{ flex: 1 }}>
                  <Text style={ab.retryTitle} numberOfLines={1}>
                    {meta.title[lang] ?? meta.title.en}
                  </Text>
                  <Text style={ab.retrySub}>{t("tabs.home.retry_score", { pct })}</Text>
                </VStack>
                <Text style={ab.retryCta}>{t("tabs.home.retry_cta")} →</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ── Knowledge Insight card ────────────────────────────── */}
      {latestInsight && (
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/insight", params: { data: JSON.stringify(latestInsight) } })}
            style={ic.card}
            activeOpacity={0.85}
          >
            <View style={ic.topRow}>
              <Text style={ic.eyebrow}>{t("insight.card_eyebrow")}</Text>
              {!latestInsight.read && (
                <View style={ic.newBadge}>
                  <Text style={ic.newBadgeText}>{t("insight.card_new")}</Text>
                </View>
              )}
            </View>
            <Text style={ic.title} numberOfLines={2}>{latestInsight.title}</Text>
            <Text style={ic.intro} numberOfLines={2}>{latestInsight.intro}</Text>
            <Text style={ic.cta}>{t("insight.card_cta")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Desafio inicial ────────────────────────────────────── */}
      {!loadingUser && user?.createdAt && (
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <StarterChallengeCard
            challenge={user.starterChallenge}
            createdAt={user.createdAt}
          />
        </View>
      )}

      {/* ── Missões diárias ────────────────────────────────────── */}
      {missions.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <MissionsCard missions={missions} />
        </View>
      )}

      {/* ── Missões semanais ───────────────────────────────────── */}
      {weeklyMissions.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <WeeklyMissionsCard missions={weeklyMissions} />
        </View>
      )}

      {/* ── Semana ─────────────────────────────────────────────── */}
      {weeklyData.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <WeeklyCard
            data={weeklyData}
            goalMin={user?.dailyGoalMin ?? 10}
            lang={lang}
            studiedLabel={t("tabs.home.studied")}
            screenWidth={screenWidth}
          />
        </View>
      )}

      {/* ── Premium banner — free users only ──────────────────── */}
      {FEATURES.PREMIUM && !isPremium && (
        <Pressable
          onPress={() => router.push("/(premium)/paywall")}
          style={pmb.wrap}
        >
          <View style={pmb.iconWrap}>
            <Ionicons name="sparkles" size={18} color="#F5C77A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pmb.title}>{t("tabs.tracks.premium_banner_title")}</Text>
            <Text style={pmb.desc}>{t("tabs.tracks.premium_banner_desc")}</Text>
          </View>
          <View style={pmb.cta}>
            <Text style={pmb.ctaText}>{t("tabs.tracks.premium_banner_cta")}</Text>
          </View>
        </Pressable>
      )}

    </ScrollView>
    </>
  );
}

// ---------------------------------------------------------------------------
// Header styles
// ---------------------------------------------------------------------------

const hd = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImg: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  logoText: {
    color: "#E6EAF2",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A130A",
    borderWidth: 1,
    borderColor: "#F5C77A28",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  streakNum: { color: "#F5C77A", fontSize: 13, fontWeight: "800" },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#7B8FE018",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  shieldNum: { color: "#7B8FE0", fontSize: 10, fontWeight: "700" },
  recoveryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#1A130A",
    borderWidth: 1,
    borderColor: "#F5C77A30",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recoveryTitle: {
    color: "#F5C77A",
    fontSize: 13,
    fontWeight: "700",
  },
  recoverySubtitle: {
    color: "#AAB0C0",
    fontSize: 12,
    marginTop: 2,
  },
  levelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 11,
    fontWeight: "800",
  },
  levelText: {
    color: "#4A5568",
    fontSize: 13,
    fontWeight: "600",
  },
  xpBarTrack: {
    height: 4,
    backgroundColor: "#1A2233",
    borderRadius: 99,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 99,
  },
});

// ---------------------------------------------------------------------------
// Comeback banner styles
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Lesson card styles
// ---------------------------------------------------------------------------

const lc = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    color: "#4A5568",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  donePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doneText: {
    color: "#5ED19A",
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Hero card ──────────────────────────────────────────────
  heroWrap: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#121826",
  },
  heroCard: {
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 210,
  },
  heroScrimMid: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,15,20,0.52)",
  },
  heroScrimBot: {
    position: "absolute",
    top: "55%",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,15,20,0.62)",
  },
  doneDimOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,15,20,0.35)",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 12,
  },
  trackPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  trackPillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#E6EAF2",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  heroDuration: {
    color: "#AAB0C0",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Attached CTA button ────────────────────────────────────
  heroCtaDivider: {
    height: 1,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  heroCtaDone: {
    backgroundColor: "transparent",
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  // ── Other tracks list card ─────────────────────────────────
  listCard: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderRadius: 24,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  listDivider: {
    height: 1,
    backgroundColor: "#1A2233",
    marginHorizontal: 16,
  },
  trackDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  trackIconLetter: {
    fontSize: 17,
    fontWeight: "800",
  },
  listRowEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  listRowTitle: {
    color: "#E6EAF2",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
});

// ---------------------------------------------------------------------------
// Action banners (review + retry)
// ---------------------------------------------------------------------------

const ab = StyleSheet.create({
  reviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1220",
    borderWidth: 1,
    borderColor: "#7B8FE030",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  reviewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7B8FE015",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewTitle: {
    color: "#7B8FE0",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewSub: {
    color: "#7B8FE055",
    fontSize: 11,
    marginTop: 2,
  },
  reviewCta: {
    color: "#7B8FE0",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
  },
  retryCard: {
    backgroundColor: "#0C1810",
    borderWidth: 1,
    borderColor: "#5ED19A28",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  retryEyebrow: {
    color: "#5ED19A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  retryTitle: {
    color: "#E6EAF2",
    fontSize: 14,
    fontWeight: "700",
  },
  retrySub: {
    color: "#7B8193",
    fontSize: 12,
    marginTop: 2,
  },
  retryCta: {
    color: "#5ED19A",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
    marginLeft: 12,
  },
});


// ---------------------------------------------------------------------------
// Insight card styles
// ---------------------------------------------------------------------------

const ic = StyleSheet.create({
  card: {
    backgroundColor: "#0D1428",
    borderWidth: 1,
    borderColor: "#7B8FE040",
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#7B8FE0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  newBadge: {
    backgroundColor: "#7B8FE020",
    borderWidth: 1,
    borderColor: "#7B8FE050",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: { color: "#7B8FE0", fontSize: 10, fontWeight: "700" },
  title: { color: "#E6EAF2", fontSize: 15, fontWeight: "700", lineHeight: 21 },
  intro: { color: "#7B8193", fontSize: 13, lineHeight: 19 },
  cta: { color: "#7B8FE0", fontSize: 13, fontWeight: "700", marginTop: 2 },
});

// ---------------------------------------------------------------------------
// Premium banner styles
// ---------------------------------------------------------------------------

const pmb = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#111420",
    borderWidth: 1,
    borderColor: "#F5C77A33",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5C77A15",
    borderWidth: 1,
    borderColor: "#F5C77A30",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { color: "#E6EAF2", fontSize: 13, fontWeight: "700" },
  desc: { color: "#7B8193", fontSize: 12, marginTop: 2 },
  cta: {
    backgroundColor: "#F5C77A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  ctaText: { color: "#0B0F14", fontSize: 12, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Share modal styles
// ---------------------------------------------------------------------------

const sh = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    gap: 16,
  },
  sheetTitle: {
    color: "#E6EAF2",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sheetSub: {
    color: "#7B8193",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  shareBtn: {
    backgroundColor: "#F5C77A",
    borderRadius: 18,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  shareBtnText: {
    color: "#0B0F14",
    fontSize: 16,
    fontWeight: "800",
  },
  dismiss: {
    color: "#3A4558",
    fontSize: 14,
    paddingVertical: 4,
  },
});
