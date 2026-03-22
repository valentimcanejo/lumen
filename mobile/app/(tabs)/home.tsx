import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
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

import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { LumenCard } from "../../components/ui/lumen/Card";
import { LumenButton } from "../../components/ui/lumen/Button";

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
  const todayIndex = today === 0 ? 6 : today - 1; // Mon=0 … Sun=6
  const labels = DAY_LABELS[lang] ?? DAY_LABELS.en;
  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const weekGoal = goalMin * 7;
  const weekPct = weekGoal > 0 ? Math.min(totalMinutes / weekGoal, 1) : 0;
  const weekDone = weekPct >= 1;

  return (
    <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
      {/* Header row */}
      <HStack className="items-end justify-between mb-5">
        <HStack className="items-baseline" space="xs">
          <Text className="text-[#F5C77A] text-[28px] font-bold">{totalMinutes}</Text>
          <Text className="text-[#AAB0C0] text-[13px]">min {studiedLabel}</Text>
        </HStack>
        {weekDone && (
          <Box className="bg-[#F5C77A]/15 border border-[#F5C77A]/30 rounded-full px-3 py-1">
            <Text className="text-[#F5C77A] text-[11px] font-semibold">🏆 Meta!</Text>
          </Box>
        )}
      </HStack>

      {/* Day circles */}
      <HStack className="justify-between mb-4">
        {data.map((d, i) => {
          const done = d.minutes >= goalMin;
          const isToday = i === todayIndex;
          const isFuture = i > todayIndex;

          return (
            <VStack key={d.date} className="items-center" space="xs">
              <Box
                className="w-[38px] h-[38px] rounded-full items-center justify-center"
                style={{
                  backgroundColor: done
                    ? "#F5C77A"
                    : isToday
                      ? "transparent"
                      : "#1A2233",
                  borderWidth: isToday && !done ? 2 : 0,
                  borderColor: "#F5C77A99",
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={20} color="#0B0F14" />
                ) : isToday ? (
                  <Box className="w-[7px] h-[7px] rounded-full bg-[#F5C77A]" />
                ) : isFuture ? null : (
                  <Box className="w-[5px] h-[5px] rounded-full bg-[#3A4458]" />
                )}
              </Box>
              <Text
                className="text-[11px] font-semibold"
                style={{ color: isToday ? "#F5C77A" : "#4A5568" }}
              >
                {labels[i]}
              </Text>
            </VStack>
          );
        })}
      </HStack>

      {/* Progress bar */}
      <Box className="h-[5px] bg-[#1A2233] rounded-full overflow-hidden">
        <Box
          className="h-full rounded-full"
          style={{
            width: `${weekPct * 100}%`,
            backgroundColor: weekDone ? "#5ED19A" : "#F5C77A",
          }}
        />
      </Box>
      <HStack className="justify-between mt-1">
        <Text className="text-[#4A5568] text-[11px]">
          {Math.round(weekPct * 100)}% da semana
        </Text>
        <Text className="text-[#4A5568] text-[11px]">
          {totalMinutes} / {weekGoal} min
        </Text>
      </HStack>
    </Box>
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

  useEffect(() => {
    if (!currentUserId) return;
    getUserData({ userId: currentUserId }).then((u) => setUser(u ?? null));
    getWeeklyData(currentUserId).then(setWeeklyData).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

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
      {todayGoal && (
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
      {goals
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
  );
}
