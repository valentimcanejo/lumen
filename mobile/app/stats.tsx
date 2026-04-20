import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useAuth } from "../hooks/useAuth";
import { getSessionLog, type SessionLogEntry } from "../repositories/progress.repo";
import { getTracks } from "../repositories/tracks.repo";
import { trackColor } from "../constants/tracks";
import type { Track } from "../models/track";
import type { Lang } from "../models/lang";

type TrackStat = {
  trackId: string;
  trackName: string;
  color: string;
  sessions: number;
  minutes: number;
  avgScore: number; // 0–1
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatMin(m: number) {
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const [sessions, setSessions] = useState<SessionLogEntry[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    Promise.all([getSessionLog(uid), getTracks()])
      .then(([s, tr]) => { setSessions(s); setTracks(tr); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);

  const trackStats = useMemo((): TrackStat[] => {
    const map: Record<string, { sessions: number; minutes: number; totalScore: number; scoredSessions: number }> = {};
    for (const s of sessions) {
      if (!s.trackId) continue;
      if (!map[s.trackId]) map[s.trackId] = { sessions: 0, minutes: 0, totalScore: 0, scoredSessions: 0 };
      map[s.trackId].sessions += 1;
      map[s.trackId].minutes += s.minutes ?? 0;
      if (s.quizScore !== undefined) {
        map[s.trackId].totalScore += s.quizScore;
        map[s.trackId].scoredSessions += 1;
      }
    }
    return Object.entries(map)
      .map(([trackId, v]) => {
        const track = tracks.find((t) => t.id === trackId);
        return {
          trackId,
          trackName: track?.title?.[lang] ?? track?.title?.pt ?? trackId,
          color: trackColor(trackId),
          sessions: v.sessions,
          minutes: v.minutes,
          avgScore: v.scoredSessions > 0 ? v.totalScore / v.scoredSessions : 0,
        };
      })
      .sort((a, b) => b.sessions - a.sessions);
  }, [sessions, tracks, lang]);

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((s, e) => s + (e.minutes ?? 0), 0);
  const overallAvg = sessions.length > 0
    ? sessions.filter((s) => s.quizScore !== undefined).reduce((s, e) => s + e.quizScore, 0) /
      Math.max(1, sessions.filter((s) => s.quizScore !== undefined).length)
    : 0;

  const maxSessions = Math.max(1, ...trackStats.map((t) => t.sessions));

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
        </TouchableOpacity>
        <Text style={s.title}>{t("stats.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Overview cards */}
        <View style={s.overviewRow}>
          <View style={s.overviewCard}>
            <Text style={s.overviewValue}>{totalSessions}</Text>
            <Text style={s.overviewLabel}>{t("stats.total_sessions")}</Text>
          </View>
          <View style={s.overviewCard}>
            <Text style={s.overviewValue}>{formatMin(totalMinutes)}</Text>
            <Text style={s.overviewLabel}>{t("stats.total_time")}</Text>
          </View>
          <View style={s.overviewCard}>
            <Text style={[s.overviewValue, { color: overallAvg >= 0.7 ? "#5ED19A" : overallAvg >= 0.4 ? "#F5C77A" : "#E26D6D" }]}>
              {pct(overallAvg)}
            </Text>
            <Text style={s.overviewLabel}>{t("stats.avg_score")}</Text>
          </View>
        </View>

        {loading ? (
          <Text style={s.empty}>{t("common.loading")}</Text>
        ) : trackStats.length === 0 ? (
          <Text style={s.empty}>{t("stats.empty")}</Text>
        ) : (
          <>
            {/* Sessions per track */}
            <Text style={s.sectionTitle}>{t("stats.by_track")}</Text>
            {trackStats.map((tr) => (
              <View key={tr.trackId} style={s.trackRow}>
                <View style={s.trackMeta}>
                  <View style={[s.trackDot, { backgroundColor: tr.color }]} />
                  <Text style={s.trackName} numberOfLines={1}>{tr.trackName}</Text>
                  <Text style={s.trackSessions}>{tr.sessions} sess.</Text>
                </View>

                {/* Sessions bar */}
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${(tr.sessions / maxSessions) * 100}%`, backgroundColor: tr.color + "90" }]} />
                </View>

                {/* Score pill */}
                <View style={s.scorePill}>
                  <Ionicons
                    name="checkmark-circle"
                    size={11}
                    color={tr.avgScore >= 0.7 ? "#5ED19A" : tr.avgScore >= 0.4 ? "#F5C77A" : "#E26D6D"}
                  />
                  <Text style={[
                    s.scoreText,
                    { color: tr.avgScore >= 0.7 ? "#5ED19A" : tr.avgScore >= 0.4 ? "#F5C77A" : "#E26D6D" },
                  ]}>
                    {pct(tr.avgScore)}
                  </Text>
                  <Text style={s.scoreMinutes}>{formatMin(tr.minutes)}</Text>
                </View>
              </View>
            ))}

            {/* Best and worst track */}
            {trackStats.length >= 2 && (
              <View style={s.insightRow}>
                <View style={[s.insightCard, { borderColor: "#5ED19A30" }]}>
                  <Text style={s.insightIcon}>🏆</Text>
                  <Text style={s.insightLabel}>{t("stats.best_track")}</Text>
                  <Text style={[s.insightTrack, { color: trackStats.slice().sort((a, b) => b.avgScore - a.avgScore)[0].color }]}>
                    {trackStats.slice().sort((a, b) => b.avgScore - a.avgScore)[0].trackName}
                  </Text>
                  <Text style={s.insightScore}>
                    {pct(trackStats.slice().sort((a, b) => b.avgScore - a.avgScore)[0].avgScore)}
                  </Text>
                </View>
                <View style={[s.insightCard, { borderColor: "#E26D6D30" }]}>
                  <Text style={s.insightIcon}>📈</Text>
                  <Text style={s.insightLabel}>{t("stats.weakest_track")}</Text>
                  <Text style={[s.insightTrack, { color: trackStats.slice().sort((a, b) => a.avgScore - b.avgScore)[0].color }]}>
                    {trackStats.slice().sort((a, b) => a.avgScore - b.avgScore)[0].trackName}
                  </Text>
                  <Text style={s.insightScore}>
                    {pct(trackStats.slice().sort((a, b) => a.avgScore - b.avgScore)[0].avgScore)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F14" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  title: { color: "#E6EAF2", fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  overviewRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  overviewCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  overviewValue: { color: "#E6EAF2", fontSize: 20, fontWeight: "800" },
  overviewLabel: { color: "#7B8193", fontSize: 11, marginTop: 4, textAlign: "center" },
  sectionTitle: {
    color: "#AAB0C0",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  trackRow: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  trackMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  trackDot: { width: 8, height: 8, borderRadius: 4 },
  trackName: { color: "#E6EAF2", fontSize: 13, fontWeight: "600", flex: 1 },
  trackSessions: { color: "#7B8193", fontSize: 12 },
  barTrack: {
    height: 6,
    backgroundColor: "#1A2233",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  scorePill: { flexDirection: "row", alignItems: "center", gap: 6 },
  scoreText: { fontSize: 12, fontWeight: "700" },
  scoreMinutes: { color: "#4A5568", fontSize: 12, marginLeft: "auto" },
  insightRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  insightCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  insightIcon: { fontSize: 20 },
  insightLabel: { color: "#7B8193", fontSize: 11, textAlign: "center" },
  insightTrack: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  insightScore: { color: "#AAB0C0", fontSize: 12 },
  empty: { color: "#7B8193", fontSize: 14, textAlign: "center", marginTop: 40 },
});
