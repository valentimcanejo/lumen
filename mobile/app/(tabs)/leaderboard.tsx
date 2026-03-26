import React from "react";
import { FlatList, View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Text } from "../../components/ui/text";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { useLeaderboard } from "../../hooks/useLeaderboard";
import { getLevelTier } from "../../models/user";
import { getCurrentWeekId } from "../../repositories/leaderboard.repo";
import type { LeaderboardEntry } from "../../models/leaderboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEDALS = ["🥇", "🥈", "🥉"];

function weekLabel(weekId: string): string {
  const [yearStr, wStr] = weekId.split("-W");
  const year = Number(yearStr);
  const week = Number(wStr);
  const jan1 = new Date(year, 0, 1);
  const daysToFirst = (8 - jan1.getDay()) % 7;
  const monday = new Date(jan1);
  monday.setDate(jan1.getDate() + daysToFirst + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function EntryRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const tier = getLevelTier(entry.level);
  return (
    <View style={[s.row, isMe && s.rowMe]}>
      <View style={s.rankBox}>
        {rank <= 3 ? (
          <Text style={s.medal}>{MEDALS[rank - 1]}</Text>
        ) : (
          <Text style={[s.rankNum, isMe && s.rankNumMe]}>#{rank}</Text>
        )}
      </View>

      <View style={[s.dot, { backgroundColor: tier.color }]} />

      <Text style={[s.name, isMe && s.nameMe]} numberOfLines={1}>
        {entry.displayName}
      </Text>

      <Text style={[s.xp, isMe && s.xpMe]}>{entry.weekXp} XP</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { getUserData } = useUser();
  const [level, setLevel] = React.useState(1);

  React.useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((u) => {
      if (u?.level) setLevel(u.level);
    });
  }, [uid]);

  const { state, loading, refresh } = useLeaderboard(uid, level);
  const weekId = getCurrentWeekId();
  const tier = state?.tier ?? getLevelTier(level);

  return (
    <View style={[s.screen, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={[s.tierBadge, { borderColor: tier.color + "66", backgroundColor: tier.color + "18" }]}>
            <Text style={[s.tierName, { color: tier.color }]}>{tier.name}</Text>
          </View>
          <Text style={s.weekLabel}>{weekLabel(weekId)}</Text>
        </View>

        <TouchableOpacity onPress={refresh} style={s.iconBtn}>
          <Ionicons name="refresh" size={18} color="#7B8193" />
        </TouchableOpacity>
      </View>

      {/* Divider with tier color */}
      <View style={[s.tierLine, { backgroundColor: tier.color + "44" }]} />

      {loading ? (
        <ActivityIndicator color={tier.color} style={{ marginTop: 40 }} />
      ) : !state || state.entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏆</Text>
          <Text style={s.emptyText}>{t("leaderboard.empty")}</Text>
        </View>
      ) : (
        <>
          {/* Current user card */}
          {state.currentUserEntry && (
            <View style={[s.myCard, { borderColor: tier.color + "55" }]}>
              <Text style={s.myCardLabel}>{t("leaderboard.your_position")}</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <Text style={[s.myCardRank, { color: tier.color }]}>
                  {state.currentUserRank ? `#${state.currentUserRank}` : t("leaderboard.outside_top")}
                </Text>
                <Text style={s.myCardXp}>· {state.currentUserEntry.weekXp} XP</Text>
              </View>
            </View>
          )}

          <FlatList
            data={state.entries}
            keyExtractor={(item) => item.uid}
            renderItem={({ item, index }) => (
              <EntryRow entry={item} rank={index + 1} isMe={item.uid === uid} />
            )}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
            ItemSeparatorComponent={() => <View style={s.separator} />}
          />
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B0F14" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  iconBtn: { padding: 4, width: 32 },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  tierName: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  weekLabel: { color: "#7B8193", fontSize: 11 },
  tierLine: { height: 1, marginHorizontal: 16, marginBottom: 12 },
  myCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#121826",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  myCardLabel: {
    color: "#AAB0C0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  myCardRank: { fontSize: 24, fontWeight: "800" },
  myCardXp: { color: "#7B8193", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
    borderRadius: 12,
  },
  rowMe: { backgroundColor: "#F5C77A08" },
  rankBox: { width: 36, alignItems: "center" },
  medal: { fontSize: 20 },
  rankNum: { color: "#4A5568", fontSize: 13, fontWeight: "700" },
  rankNumMe: { color: "#F5C77A" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, color: "#AAB0C0", fontSize: 14 },
  nameMe: { color: "#E6EAF2", fontWeight: "700" },
  xp: { color: "#5ED19A", fontSize: 13, fontWeight: "700", minWidth: 64, textAlign: "right" },
  xpMe: { color: "#F5C77A" },
  separator: { height: 1, backgroundColor: "#1A223360", marginLeft: 50 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: "#7B8193", fontSize: 14, textAlign: "center", maxWidth: 260 },
});
