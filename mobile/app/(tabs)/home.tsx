import React, { useEffect, useState } from "react";
import { ScrollView, View, StyleSheet, Modal, Pressable } from "react-native";
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
import { getActiveGoals, type Goal } from "../../repositories/goals.repo";
import { getWeeklyData, type DayData } from "../../repositories/progress.repo";
import { todayYmd } from "../../repositories/session.repo";
import {
  type UserProfile,
  LEVEL_XP_THRESHOLDS,
  xpToLevel,
  xpForNextLevel,
} from "../../models/user";
import type { Lang } from "../../models/lang";

// ---------------------------------------------------------------------------
// Streak pill with pulsing animation
// ---------------------------------------------------------------------------

function StreakPill({ streak }: { streak: number }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <HStack className="items-center bg-[#1A2233] rounded-full px-3 py-1.5" space="xs">
      <Animated.Text style={animStyle}>🔥</Animated.Text>
      <Text className="text-[#E6EAF2] text-[13px]">
        {t("tabs.home.streak")}: {streak}
      </Text>
    </HStack>
  );
}

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
  minutesLabel: { color: "#AAB0C0", fontSize: 13, marginBottom: 3, marginLeft: 4 },
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
                    backgroundColor: done ? "#F5C77A" : isToday ? "transparent" : "#1A2233",
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
                  <View style={[wk.dot, { backgroundColor: "#3A4458", width: 5, height: 5, borderRadius: 3 }]} />
                )}
              </View>
              <Text style={[wk.dayLabel, { color: isToday ? "#F5C77A" : "#4A5568" }]}>
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
        <Text style={wk.statsText}>{totalMinutes} / {weekGoal} min</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pack of the day: deterministic from date + selectedGoalIds
// ---------------------------------------------------------------------------

function packOfDay(goalIds: string[], dateStr: string): string | null {
  if (!goalIds.length) return null;
  const n = dateStr
    .replace(/-/g, "")
    .split("")
    .reduce((a, c) => a * 10 + Number(c), 0);
  return goalIds[n % goalIds.length];
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
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
  title: { color: "#E6EAF2", fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#AAB0C0", fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 20 },
  streakRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 6 },
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    setLoadingUser(true);
    getUserData({ userId: currentUserId })
      .then((u) => setUser(u ?? null))
      .finally(() => setLoadingUser(false));
    getWeeklyData(currentUserId).then(setWeeklyData).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    const today = todayYmd();
    AsyncStorage.getItem("lastOpenDate").then((last) => {
      if (last && last !== today) {
        setShowWelcomeBack(true);
      }
      AsyncStorage.setItem("lastOpenDate", today);
    });
  }, []);

  useEffect(() => {
    getActiveGoals().then(setGoals).catch(() => setGoals([]));
  }, []);

  const lang = (user?.lang ?? i18n.language ?? "pt") as Lang;
  const streak = user?.streak?.current ?? 0;
  const xp = user?.xp ?? 0;
  const level = xpToLevel(xp);
  const xpFloor = LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
  const xpCeil = xpForNextLevel(level);
  const xpPct = xpCeil > xpFloor ? (xp - xpFloor) / (xpCeil - xpFloor) : 1;

  const selectedGoals = user?.selectedGoalIds ?? [];
  const todayPackId = packOfDay(selectedGoals, todayYmd());
  const todayGoal = goals.find((g) => g.id === todayPackId);

  function startSession(contentId: string) {
    router.push({
      pathname: "/(session)/lesson",
      params: { contentId, version: "1", lang },
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
      {/* Header with level + XP bar */}
      <Box className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center justify-between">
          <Text className="text-[#E6EAF2] text-[22px] font-bold">Lumen</Text>
          <Text className="text-[#F5C77A] text-[13px] font-semibold">
            {t("tabs.home.level", { level })}
          </Text>
        </HStack>
        <Box className="h-[3px] bg-[#1A2233] rounded-full mt-2 overflow-hidden">
          <Box
            className="h-full bg-[#F5C77A]"
            style={{ width: `${Math.min(xpPct * 100, 100)}%` }}
          />
        </Box>
      </Box>

      {/* Title + streak */}
      <Box className="px-6 pt-5">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">
          {t("tabs.home.title")}
        </Text>
        <HStack className="mt-3" space="sm">
          <StreakPill streak={streak} />
        </HStack>
      </Box>

      {/* Pack of the day */}
      {loadingUser && (
        <Box className="px-6 mt-5">
          <SkeletonCard />
        </Box>
      )}
      {!loadingUser && todayGoal && (
        <Box className="px-6 mt-5">
          <Text className="text-[#AAB0C0] text-[11px] font-semibold tracking-widest mb-2">
            {t("tabs.home.pack_of_day").toUpperCase()}
          </Text>
          <LumenCard>
            <VStack space="md">
              <Text className="text-[#E6EAF2] text-[20px] font-semibold">
                {todayGoal.title[lang]}
              </Text>
              {todayGoal.description?.[lang] ? (
                <Text className="text-[#AAB0C0]">
                  {todayGoal.description[lang]}
                </Text>
              ) : null}
              <LumenButton onPress={() => startSession(todayGoal.id)}>
                {t("tabs.home.start")}
              </LumenButton>
            </VStack>
          </LumenCard>
        </Box>
      )}

      {/* Other selected goals */}
      {!loadingUser && goals
        .filter(
          (g) => selectedGoals.includes(g.id) && g.id !== todayPackId,
        )
        .map((goal) => (
          <Box key={goal.id} className="px-6 mt-3">
            <LumenCard>
              <VStack space="md">
                <Text className="text-[#E6EAF2] text-[18px] font-semibold">
                  {goal.title[lang]}
                </Text>
                <LumenButton onPress={() => startSession(goal.id)}>
                  {t("tabs.home.start")}
                </LumenButton>
              </VStack>
            </LumenCard>
          </Box>
        ))}

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
