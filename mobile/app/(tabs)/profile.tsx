import React, { useState, useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Platform, ScrollView, ActivityIndicator, Linking, Alert, useWindowDimensions, View, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";

import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { setUserLanguage, getCompletedContentIds } from "../../repositories/user.repo";
import { getStudyHeatmap } from "../../repositories/progress.repo";
import { getTracks } from "../../repositories/tracks.repo";
import { getLessonCountForTrack } from "../../repositories/lessons.repo";
import { getLatestWeeklyReport } from "../../repositories/weeklyReports.repo";
import { usePremium } from "../../hooks/usePremium";
import type { WeeklyReport } from "../../models/weeklyReport";
import { trackColor, trackBg } from "../../constants/tracks";
import type { Track } from "../../models/track";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../../services/notifications.service";
import { setLanguage as setI18nLanguage } from "../../i18n/setLanguage";
import type { Lang } from "../../models/lang";
import {
  levelXpThreshold,
  xpToLevel,
  xpForNextLevel,
  getLevelTier,
  type AchievementId,
  type UserProfile,
} from "../../models/user";
import { ACHIEVEMENTS, type AchievementDef } from "../../repositories/achievements.repo";

// ---------------------------------------------------------------------------
// Achievements grid — compact 5-column layout, expandable
// ---------------------------------------------------------------------------

const COLS = 5;
const BADGE_GAP = 8;

function AchievementsGrid({ achievements }: { achievements: AchievementDef[] }) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const tooltipOpacity = useSharedValue(0);
  const tooltipY = useSharedValue(8);

  const COLLAPSED_MAX = 10;
  const visible = expanded ? achievements : achievements.slice(0, COLLAPSED_MAX);
  const hasMore = achievements.length > COLLAPSED_MAX;

  const totalGaps = (COLS - 1) * BADGE_GAP;
  const cellSize = Math.floor((screenWidth - 40 - 32 - totalGaps) / COLS);

  const rows: AchievementDef[][] = [];
  for (let i = 0; i < visible.length; i += COLS) {
    rows.push(visible.slice(i, i + COLS));
  }

  function handleBadgePress(a: AchievementDef) {
    setSelected(a);
    tooltipOpacity.value = withTiming(1, { duration: 160 });
    tooltipY.value = withSpring(0, { damping: 16, stiffness: 260 });
  }

  function dismissTooltip() {
    tooltipOpacity.value = withTiming(0, { duration: 120 });
    tooltipY.value = withTiming(8, { duration: 120 });
  }

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ translateY: tooltipY.value }],
  }));

  return (
    <View style={ag.container}>
      <View style={ag.header}>
        <Text style={ag.title}>{t("tabs.profile.achievements")}</Text>
        <Text style={ag.count}>{achievements.length}</Text>
      </View>

      <View style={ag.card}>
        {rows.map((row, ri) => (
          <View key={ri} style={[ag.row, ri > 0 && { marginTop: BADGE_GAP }]}>
            {row.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => handleBadgePress(a)}
                style={[ag.badge, { width: cellSize, height: cellSize }]}
              >
                <Text style={{ fontSize: cellSize * 0.42 }}>{a.icon}</Text>
              </Pressable>
            ))}
            {row.length < COLS &&
              Array.from({ length: COLS - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: cellSize }} />
              ))}
          </View>
        ))}

        {hasMore && (
          <Pressable onPress={() => setExpanded((v) => !v)} style={ag.expandBtn}>
            <Text style={ag.expandLabel}>
              {expanded
                ? t("tabs.profile.achievements_collapse")
                : t("tabs.profile.achievements_show_all", { count: achievements.length - COLLAPSED_MAX })}
            </Text>
          </Pressable>
        )}

        {/* Inline tooltip — appears below the grid on tap */}
        {selected && (
          <Pressable onPress={dismissTooltip} style={ag.tooltipTouchable}>
            <Animated.View style={[ag.tooltip, tooltipStyle]}>
              <Text style={ag.tooltipIcon}>{selected.icon}</Text>
              <Text style={ag.tooltipName}>{t(selected.titleKey)}</Text>
            </Animated.View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const ag = StyleSheet.create({
  container: { marginBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  title: { color: "#E6EAF2", fontSize: 16, fontWeight: "600" },
  count: {
    color: "#AAB0C0", fontSize: 12, fontWeight: "600",
    backgroundColor: "#1A2233", paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10,
  },
  card: { backgroundColor: "#111827", borderRadius: 16, padding: 16 },
  row: { flexDirection: "row", gap: BADGE_GAP },
  badge: {
    backgroundColor: "#1A2233",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expandBtn: { marginTop: 12, alignItems: "center" },
  expandLabel: { color: "#AAB0C0", fontSize: 13 },
  tooltipTouchable: { marginTop: 12 },
  tooltip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A2233",
    borderWidth: 1,
    borderColor: "#252E42",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tooltipIcon: { fontSize: 20 },
  tooltipName: { color: "#E6EAF2", fontSize: 14, fontWeight: "600", flex: 1 },
});

// ---------------------------------------------------------------------------
// Heatmap helpers
// ---------------------------------------------------------------------------

const HEATMAP_WEEKS = 16;
const CELL_GAP = 3;

// Returns the Monday of the week that was `weeksAgo` weeks before today
function startMonday(weeksAgo: number): Date {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const d = new Date(today);
  d.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - (weeksAgo - 1) * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function minutesToColor(minutes: number): string {
  if (minutes <= 0) return "#1A2233";
  if (minutes < 10) return "#1B4332";
  if (minutes < 20) return "#2D6A4F";
  if (minutes < 30) return "#40916C";
  return "#52B788";
}

// ---------------------------------------------------------------------------
// StudyHeatmap component
// ---------------------------------------------------------------------------

function StudyHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();

  // Available width = screenWidth - px-5*2 (40px) - card padding (32px)
  const availableWidth = screenWidth - 40 - 32;
  // day labels column ~20px
  const gridWidth = availableWidth - 24;
  const cellSize = Math.floor((gridWidth - CELL_GAP * (HEATMAP_WEEKS - 1)) / HEATMAP_WEEKS);

  const start = startMonday(HEATMAP_WEEKS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build columns: each column = one week (Mon=0 … Sun=6)
  // columns[col][row] = date string or null (future)
  const columns: (string | null)[][] = [];
  const monthLabels: { col: number; label: string }[] = [];
  const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  let lastMonth = -1;
  for (let col = 0; col < HEATMAP_WEEKS; col++) {
    const week: (string | null)[] = [];
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7 + row);
      if (d > today) {
        week.push(null);
      } else {
        const dateStr = ymd(d);
        week.push(dateStr);
        // Track month label at first Monday of that month
        if (row === 0 && d.getMonth() !== lastMonth) {
          monthLabels.push({ col, label: MONTHS_SHORT[d.getMonth()] });
          lastMonth = d.getMonth();
        }
      }
    }
    columns.push(week);
  }

  const dayLabels = (t("tabs.profile.heatmap_days", { returnObjects: true }) as string[]);

  return (
    <Box className="mb-6">
      <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
        {t("tabs.profile.heatmap_title")}
      </Text>
      <Box className="bg-[#111827] rounded-2xl p-4">
        {/* Month labels */}
        <Box style={{ flexDirection: "row", marginLeft: 24, marginBottom: 4 }}>
          {monthLabels.map(({ col, label }) => (
            <Box
              key={col}
              style={{
                position: "absolute",
                left: col * (cellSize + CELL_GAP),
              }}
            >
              <Text style={{ color: "#7B8193", fontSize: 10 }}>{label}</Text>
            </Box>
          ))}
          {/* Spacer to give month row a height */}
          <Box style={{ height: 14 }} />
        </Box>

        {/* Day labels + grid */}
        <Box style={{ flexDirection: "row" }}>
          {/* Day-of-week labels: Mon, Wed, Fri */}
          <Box style={{ width: 20, marginRight: 4 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <Box
                key={row}
                style={{ height: cellSize, marginBottom: row < 6 ? CELL_GAP : 0, justifyContent: "center" }}
              >
                {(row === 1 || row === 3 || row === 5) && (
                  <Text style={{ color: "#7B8193", fontSize: 9 }}>
                    {dayLabels[row] ?? ""}
                  </Text>
                )}
              </Box>
            ))}
          </Box>

          {/* Cells */}
          <Box style={{ flexDirection: "row" }}>
            {columns.map((week, col) => (
              <Box
                key={col}
                style={{ marginRight: col < HEATMAP_WEEKS - 1 ? CELL_GAP : 0 }}
              >
                {week.map((dateStr, row) => {
                  const minutes = dateStr ? (heatmap[dateStr] ?? 0) : 0;
                  const bg = dateStr === null ? "transparent" : minutesToColor(minutes);
                  return (
                    <Box
                      key={row}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 2,
                        backgroundColor: bg,
                        marginBottom: row < 6 ? CELL_GAP : 0,
                      }}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Legend */}
        <Box style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 8, gap: 4 }}>
          <Text style={{ color: "#7B8193", fontSize: 10, marginRight: 4 }}>
            {t("tabs.profile.heatmap_less")}
          </Text>
          {[0, 8, 15, 22, 30].map((m) => (
            <Box
              key={m}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: minutesToColor(m),
              }}
            />
          ))}
          <Text style={{ color: "#7B8193", fontSize: 10, marginLeft: 4 }}>
            {t("tabs.profile.heatmap_more")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Account card
// ---------------------------------------------------------------------------

function AccountCard({
  isAnonymous,
  email,
  onSignInWithGoogle,
  onSignInWithApple,
  onSignOut,
}: {
  isAnonymous: boolean;
  email?: string | null;
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithApple: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<"google" | "apple" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);

  async function handle(
    action: "google" | "apple" | "signout",
    fn: () => Promise<void>,
  ) {
    setLoading(action);
    setError(null);
    try {
      await fn();
      if (action !== "signout") setJustLinked(true);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (
        e.code !== "ERR_REQUEST_CANCELED" &&
        e.message !== "Google sign-in was cancelled or failed."
      ) {
        setError(t("common.error_connect"));
      }
    } finally {
      setLoading(null);
    }
  }

  if (isAnonymous && !justLinked) {
    return (
      <Box className="bg-[#111827] rounded-2xl p-5 mb-6">
        <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-1">
          {t("tabs.profile.account_save_progress")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mb-5">
          {t("tabs.profile.account_save_description")}
        </Text>

        <Pressable
          onPress={() => handle("google", onSignInWithGoogle)}
          disabled={loading !== null}
          className="flex-row items-center justify-center h-[52px] rounded-2xl bg-white mb-3 opacity-100 disabled:opacity-60"
        >
          {loading === "google" ? (
            <ActivityIndicator size="small" color="#0B0F14" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#0B0F14" />
              <Text className="text-[#0B0F14] text-[15px] font-semibold ml-2">
                {t("tabs.profile.account_google")}
              </Text>
            </>
          )}
        </Pressable>

        {Platform.OS === "ios" && (
          <Pressable
            onPress={() => handle("apple", onSignInWithApple)}
            disabled={loading !== null}
            className="flex-row items-center justify-center h-[52px] rounded-2xl bg-[#1C1C1E] border border-[#2A2A2E] disabled:opacity-60"
          >
            {loading === "apple" ? (
              <ActivityIndicator size="small" color="#E6EAF2" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#E6EAF2" />
                <Text className="text-[#E6EAF2] text-[15px] font-semibold ml-2">
                  {t("tabs.profile.account_apple")}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {error && (
          <Text className="text-[#E26D6D] text-[12px] mt-3 text-center">
            {error}
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box className="bg-[#111827] rounded-2xl p-5 mb-6">
      {justLinked && (
        <HStack className="items-center bg-[#1A2E1A] rounded-xl px-3 py-2 mb-4" space="sm">
          <Ionicons name="checkmark-circle" size={16} color="#5ED19A" />
          <Text className="text-[#5ED19A] text-[13px] font-medium">
            {t("tabs.profile.account_linked_success")}
          </Text>
        </HStack>
      )}
      <HStack className="items-center mb-4" space="md">
        <Box className="w-10 h-10 rounded-full bg-[#1A2233] items-center justify-center">
          <Ionicons name="person" size={20} color="#F5C77A" />
        </Box>
        <VStack>
          <Text className="text-[#E6EAF2] text-[14px] font-semibold">
            {t("tabs.profile.account_linked")}
          </Text>
          {email ? (
            <Text className="text-[#AAB0C0] text-[12px]">{email}</Text>
          ) : (
            <Text className="text-[#AAB0C0] text-[12px]">
              {t("tabs.profile.account_synced")}
            </Text>
          )}
        </VStack>
      </HStack>

      <Pressable
        onPress={() => handle("signout", onSignOut)}
        disabled={loading !== null}
        className="flex-row items-center justify-center h-[44px] rounded-xl border border-[#1A2233] disabled:opacity-60"
      >
        {loading === "signout" ? (
          <ActivityIndicator size="small" color="#AAB0C0" />
        ) : (
          <Text className="text-[#AAB0C0] text-[14px]">
            {t("tabs.profile.account_sign_out")}
          </Text>
        )}
      </Pressable>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LanguageSelector({
  lang,
  onChange,
}: {
  lang: string;
  onChange: (lang: string) => void;
}) {
  const LABELS: Record<string, string> = { pt: "PT", en: "EN", es: "ES" };
  return (
    <HStack className="gap-2">
      {(["pt", "en", "es"] as const).map((code) => {
        const active = lang === code;
        return (
          <Pressable
            key={code}
            onPress={() => onChange(code)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: active ? "#F5C77A" : "#2A3448",
              backgroundColor: active ? "#F5C77A18" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: active ? "#F5C77A" : "#4A5568",
                letterSpacing: 0.5,
              }}
            >
              {LABELS[code]}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}

// ---------------------------------------------------------------------------
// Mastery section — tracks with at least one completed lesson
// ---------------------------------------------------------------------------

function MasterySection({
  tracks,
  completedIds,
  lang,
}: {
  tracks: Track[];
  completedIds: string[];
  lang: Lang;
}) {
  const { t } = useTranslation();

  const withProgress = tracks
    .map((track) => {
      const total = getLessonCountForTrack(track.id);
      const done = completedIds.filter((id) => id.startsWith(track.id)).length;
      return { track, total, done };
    })
    .filter(({ done }) => done > 0)
    .sort((a, b) => b.done / (b.total || 1) - a.done / (a.total || 1));

  if (withProgress.length === 0) return null;

  const mastered = withProgress.filter(({ done, total }) => total > 0 && done >= total);
  const inProgress = withProgress.filter(({ done, total }) => total > 0 && done < total);

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <Text style={{ color: "#E6EAF2", fontSize: 16, fontWeight: "600" }}>
          {t("tabs.profile.mastery_title")}
        </Text>
        {mastered.length > 0 && (
          <View style={{
            backgroundColor: "#1A2233", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
          }}>
            <Text style={{ color: "#AAB0C0", fontSize: 12, fontWeight: "600" }}>
              {mastered.length}
            </Text>
          </View>
        )}
      </View>

      {/* Mastered tracks — certificate style */}
      {mastered.map(({ track, done, total }) => {
        const title = track.title[lang] ?? track.title.en ?? track.id;
        const desc = track.description?.[lang] ?? track.description?.en ?? "";
        const color = trackColor(track.id);
        const bg = trackBg(track.id);
        return (
          <View
            key={track.id}
            style={{
              backgroundColor: bg,
              borderWidth: 1.5,
              borderColor: `${color}55`,
              borderRadius: 18,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginTop: 3, flexShrink: 0 }} />
                <Text style={{ color: "#E6EAF2", fontSize: 15, fontWeight: "700", flex: 1 }}>
                  {title}
                </Text>
              </View>
              <View style={{ backgroundColor: `${color}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 }}>
                <Text style={{ color, fontSize: 11, fontWeight: "700" }}>
                  {t("tabs.profile.mastery_completed")}
                </Text>
              </View>
            </View>
            {desc ? (
              <Text style={{ color: "#AAB0C0", fontSize: 13, lineHeight: 19, marginTop: 8, marginLeft: 16 }}>
                {desc}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginLeft: 16, gap: 4 }}>
              <Ionicons name="checkmark-circle" size={13} color={color} />
              <Text style={{ color, fontSize: 12, fontWeight: "600" }}>
                {t("tabs.profile.mastery_lessons", { done, total })}
              </Text>
            </View>
          </View>
        );
      })}

      {/* In-progress tracks */}
      {inProgress.map(({ track, done, total }) => {
        const title = track.title[lang] ?? track.title.en ?? track.id;
        const color = trackColor(track.id);
        const pct = total > 0 ? done / total : 0;
        return (
          <View
            key={track.id}
            style={{
              backgroundColor: "#111827",
              borderWidth: 1,
              borderColor: "#1A2233",
              borderRadius: 18,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, flexShrink: 0 }} />
                <Text style={{ color: "#E6EAF2", fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                  {title}
                </Text>
              </View>
              <Text style={{ color: "#7B8193", fontSize: 12, fontWeight: "600" }}>
                {done}/{total}
              </Text>
            </View>
            <View style={{ height: 3, backgroundColor: "#1A2233", borderRadius: 99, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, borderRadius: 99 }} />
            </View>
            <Text style={{ color: "#7B8193", fontSize: 11, marginTop: 5 }}>
              {t("tabs.profile.mastery_in_progress")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// WeeklyReportCard — premium feature
// ---------------------------------------------------------------------------

function WeeklyReportCard({ report }: { report: WeeklyReport | null | "loading" }) {
  const { t } = useTranslation();

  return (
    <View style={wr.container}>
      <View style={wr.header}>
        <Text style={wr.title}>{t("tabs.profile.weekly_report_title")}</Text>
        <View style={wr.premiumBadge}>
          <Text style={wr.premiumBadgeText}>PREMIUM</Text>
        </View>
      </View>

      <View style={wr.card}>
        {report === "loading" ? (
          <Text style={wr.empty}>{t("tabs.profile.weekly_report_loading")}</Text>
        ) : report === null ? (
          <Text style={wr.empty}>{t("tabs.profile.weekly_report_empty")}</Text>
        ) : (
          <>
            {/* Stats row */}
            <View style={wr.statsRow}>
              <View style={wr.statChip}>
                <Text style={wr.statValue}>
                  {t("tabs.profile.weekly_report_sessions", { count: report.stats.sessionsCompleted })}
                </Text>
              </View>
              <View style={wr.statChip}>
                <Text style={wr.statValue}>
                  {t("tabs.profile.weekly_report_minutes", { count: report.stats.minutesStudied })}
                </Text>
              </View>
              <View style={wr.statChip}>
                <Text style={[wr.statValue, { color: "#F5C77A" }]}>
                  {t("tabs.profile.weekly_report_xp", { count: report.stats.xpEarned })}
                </Text>
              </View>
            </View>

            {/* Headline */}
            <Text style={wr.headline}>{report.headline}</Text>

            {/* Summary */}
            <Text style={wr.summary}>{report.summary}</Text>

            {/* Highlight */}
            <View style={wr.section}>
              <View style={wr.sectionHeader}>
                <Text style={wr.sectionIcon}>✨</Text>
                <Text style={wr.sectionLabel}>{t("tabs.profile.weekly_report_highlight")}</Text>
              </View>
              <Text style={wr.sectionText}>{report.highlight}</Text>
            </View>

            {/* Suggestion */}
            <View style={[wr.section, { marginBottom: 0 }]}>
              <View style={wr.sectionHeader}>
                <Text style={wr.sectionIcon}>🎯</Text>
                <Text style={wr.sectionLabel}>{t("tabs.profile.weekly_report_suggestion")}</Text>
              </View>
              <Text style={wr.sectionText}>{report.suggestion}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const wr = StyleSheet.create({
  container: { marginBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  title: { color: "#E6EAF2", fontSize: 16, fontWeight: "600" },
  premiumBadge: {
    backgroundColor: "#F5C77A18",
    borderWidth: 1,
    borderColor: "#F5C77A50",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  premiumBadgeText: { color: "#F5C77A", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  card: { backgroundColor: "#111827", borderRadius: 16, padding: 16 },
  empty: { color: "#7B8193", fontSize: 13, lineHeight: 20, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  statChip: {
    backgroundColor: "#1A2233",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statValue: { color: "#AAB0C0", fontSize: 12, fontWeight: "600" },
  headline: { color: "#E6EAF2", fontSize: 15, fontWeight: "700", marginBottom: 8, lineHeight: 21 },
  summary: { color: "#AAB0C0", fontSize: 13, lineHeight: 20, marginBottom: 14 },
  section: { backgroundColor: "#1A2233", borderRadius: 12, padding: 12, marginBottom: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  sectionIcon: { fontSize: 14 },
  sectionLabel: { color: "#E6EAF2", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionText: { color: "#AAB0C0", fontSize: 13, lineHeight: 20 },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { loading, getUserData } = useUser();
  const { uid, user, isAnonymous, signInWithGoogle, signInWithApple, signOut } =
    useAuth();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<Lang>("pt");
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [enablingNotif, setEnablingNotif] = useState(false);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [tracks, setTracks] = useState<Track[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null | "loading">(null);
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((u) => {
      if (!u) return;
      setProfileData(u);
      setLanguage(u.lang);
    });
    getStudyHeatmap(uid).then(setHeatmap);
    getTracks().then(setTracks).catch(() => {});
    getCompletedContentIds(uid).then(setCompletedIds).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!uid || !isPremium) return;
    setWeeklyReport("loading");
    getLatestWeeklyReport(uid)
      .then(setWeeklyReport)
      .catch(() => setWeeklyReport(null));
  }, [uid, isPremium]);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === "granted");
    });
  }, []);

  async function handleEnableNotifications() {
    setEnablingNotif(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        const title = t("onboarding.notifications.reminder_title");
        const body = t("onboarding.notifications.reminder_body");
        await scheduleDailyReminder(8, 0, title, body);
        setNotifGranted(true);
      } else {
        Linking.openSettings();
      }
    } finally {
      setEnablingNotif(false);
    }
  }

  const streak = profileData?.streak?.current ?? 0;
  const dailyGoal = profileData?.dailyGoalMin ?? 10;
  const xp = profileData?.xp ?? 0;
  const level = xpToLevel(xp);
  const tier = getLevelTier(level);
  const xpFloor = levelXpThreshold(level);
  const xpCeil = xpForNextLevel(level);
  const xpPct = xpCeil > xpFloor ? (xp - xpFloor) / (xpCeil - xpFloor) : 1;
  const unlockedAchievements = ACHIEVEMENTS.filter(
    (a) => !!profileData?.achievements?.[a.id as AchievementId],
  );

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.push("/(tabs)/home")}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>
          <Text className="text-[#E6EAF2] text-[20px] font-semibold">
            {t("tabs.profile.title")}
          </Text>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <AccountCard
          isAnonymous={isAnonymous}
          email={user?.email}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithApple={signInWithApple}
          onSignOut={signOut}
        />

        {loading ? (
          <Text className="text-[#AAB0C0]">{t("tabs.profile.loading")}</Text>
        ) : (
          <>
            {/* Level card — unified stats + XP progress */}
            <View style={[pf.levelCard, { borderColor: tier.color + "40" }]}>
              {/* Top accent bar */}
              <View style={[pf.levelAccentBar, { backgroundColor: tier.color }]} />

              <View style={pf.levelCardInner}>
                {/* Left: level number + tier pill */}
                <View style={pf.levelLeft}>
                  <Text style={[pf.levelNum, { color: tier.color }]}>{level}</Text>
                  <View style={[pf.tierPill, { backgroundColor: tier.color + "18", borderColor: tier.color + "50" }]}>
                    <Text style={[pf.tierName, { color: tier.color }]}>{tier.name}</Text>
                  </View>
                </View>

                {/* Right: stats column */}
                <View style={pf.statsCol}>
                  <View style={pf.statRow}>
                    <Text style={pf.statEmoji}>🔥</Text>
                    <Text style={pf.statNum}>{streak}</Text>
                    <Text style={pf.statUnit}>{t("tabs.profile.streak_unit")}</Text>
                  </View>
                  <View style={pf.statRow}>
                    <Text style={pf.statEmoji}>⚡</Text>
                    <Text style={pf.statNum}>{xp}</Text>
                    <Text style={pf.statUnit}>XP</Text>
                  </View>
                  <View style={pf.statRow}>
                    <Text style={pf.statEmoji}>⏱</Text>
                    <Text style={pf.statNum}>{dailyGoal}</Text>
                    <Text style={pf.statUnit}>{t("tabs.profile.daily_goal_unit")}</Text>
                  </View>
                </View>
              </View>

              {/* XP progress bar */}
              <View style={pf.xpArea}>
                <View style={pf.xpLabelRow}>
                  <Text style={pf.xpLabel}>{t("tabs.profile.level")} {level}</Text>
                  <Text style={pf.xpLabel}>{xp} / {xpCeil} XP</Text>
                </View>
                <View style={pf.xpTrack}>
                  <View style={[pf.xpFill, { width: `${Math.min(xpPct * 100, 100)}%`, backgroundColor: tier.color }]} />
                </View>
              </View>
            </View>

            {/* Mastery — tracks with progress */}
            <MasterySection
              tracks={tracks}
              completedIds={completedIds}
              lang={language}
            />

            {/* Achievements */}
            {unlockedAchievements.length > 0 && (
              <AchievementsGrid achievements={unlockedAchievements} />
            )}

            {/* Activity heatmap */}
            <StudyHeatmap heatmap={heatmap} />

            {/* Weekly AI report — premium only */}
            {isPremium && (
              <WeeklyReportCard report={weeklyReport} />
            )}

            {/* Language */}
            <HStack className="items-center justify-between mb-6">
              <Text className="text-[#4A5568] text-[13px]">
                {t("tabs.profile.language")}
              </Text>
              <LanguageSelector
                lang={language}
                onChange={async (l) => {
                  setLanguage(l as Lang);
                  if (uid) {
                    await Promise.all([
                      setUserLanguage(uid, l as Lang),
                      setI18nLanguage(l as Lang),
                    ]).catch(console.error);
                  }
                }}
              />
            </HStack>

            {/* Notifications */}
            <Box className="mb-6">
              <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
                {t("tabs.profile.notifications")}
              </Text>
              <Box className="bg-[#111827] rounded-2xl p-4">
                <Text className="text-[#AAB0C0] text-[13px] mb-3">
                  {t("tabs.profile.notifications_hint")}
                </Text>
                {notifGranted ? (
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#5ED19A"
                    />
                    <Text className="text-[#5ED19A] text-[14px] font-semibold">
                      {t("tabs.profile.notifications_active")}
                    </Text>
                  </HStack>
                ) : (
                  <Pressable
                    onPress={handleEnableNotifications}
                    disabled={enablingNotif}
                    className="h-[44px] rounded-xl bg-[#1A2233] border border-[#F5C77A]/40 items-center justify-center"
                    style={{ opacity: enablingNotif ? 0.6 : 1 }}
                  >
                    {enablingNotif ? (
                      <ActivityIndicator size="small" color="#F5C77A" />
                    ) : (
                      <HStack className="items-center" space="sm">
                        <Ionicons
                          name="notifications-outline"
                          size={17}
                          color="#F5C77A"
                        />
                        <Text className="text-[#F5C77A] text-[14px] font-semibold">
                          {t("tabs.profile.notifications_enable")}
                        </Text>
                      </HStack>
                    )}
                  </Pressable>
                )}
              </Box>
            </Box>

          </>
        )}
      </ScrollView>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Profile level card styles
// ---------------------------------------------------------------------------

const pf = StyleSheet.create({
  levelCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
  },
  levelAccentBar: {
    height: 3,
    width: "100%",
  },
  levelCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  levelLeft: {
    alignItems: "flex-start",
    gap: 10,
  },
  levelNum: {
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 68,
    letterSpacing: -2,
  },
  tierPill: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tierName: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statsCol: {
    gap: 10,
    alignItems: "flex-end",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  statNum: {
    color: "#E6EAF2",
    fontSize: 16,
    fontWeight: "800",
    minWidth: 36,
    textAlign: "right",
  },
  statUnit: {
    color: "#4A5568",
    fontSize: 12,
    fontWeight: "500",
    minWidth: 28,
  },
  xpArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 6,
  },
  xpLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xpLabel: {
    color: "#4A5568",
    fontSize: 11,
    fontWeight: "600",
  },
  xpTrack: {
    height: 6,
    backgroundColor: "#1A2233",
    borderRadius: 99,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 99,
  },
});
