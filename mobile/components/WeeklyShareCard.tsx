import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DayData } from "../repositories/progress.repo";

const DAY_LABELS: Record<string, string[]> = {
  pt: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
};

const COPY: Record<string, { days: string; week: string; min: string; streak: string; tagline: string }> = {
  pt: {
    days: "dias estudados",
    week: "esta semana",
    min: "min estudados",
    streak: "dias seguidos",
    tagline: "Trocando o scroll pelo aprendizado real.",
  },
  en: {
    days: "days studied",
    week: "this week",
    min: "min studied",
    streak: "day streak",
    tagline: "Trading endless scroll for real learning.",
  },
  es: {
    days: "días estudiados",
    week: "esta semana",
    min: "min estudiados",
    streak: "días seguidos",
    tagline: "Cambiando el scroll por aprendizaje real.",
  },
};

type Props = {
  data: DayData[];
  streak: number;
  lang: string;
};

export function WeeklyShareCard({ data, streak, lang }: Props) {
  const copy = COPY[lang] ?? COPY.pt;
  const labels = DAY_LABELS[lang] ?? DAY_LABELS.pt;
  const daysStudied = data.filter((d) => d.minutes > 0).length;
  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>LUMEN</Text>
        <View style={s.weekBadge}>
          <Text style={s.weekBadgeText}>📅 {copy.week}</Text>
        </View>
      </View>

      {/* Main stat */}
      <View style={s.mainBlock}>
        <Text style={s.daysNum}>{daysStudied}</Text>
        <Text style={s.daysLabel}>{copy.days}</Text>
      </View>

      {/* Day circles */}
      <View style={s.daysRow}>
        {data.map((d, i) => {
          const done = d.minutes > 0;
          return (
            <View key={i} style={s.dayCol}>
              <View style={[s.circle, done && s.circleDone]}>
                {done && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={[s.dayLabel, done && s.dayLabelActive]}>
                {labels[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statPill}>
          <Text style={s.statEmoji}>⏱</Text>
          <Text style={s.statText}>{totalMinutes} {copy.min}</Text>
        </View>
        {streak > 0 && (
          <View style={s.statPill}>
            <Text style={s.statEmoji}>🔥</Text>
            <Text style={s.statText}>{streak} {copy.streak}</Text>
          </View>
        )}
      </View>

      {/* Tagline */}
      <Text style={s.tagline}>&ldquo;{copy.tagline}&rdquo;</Text>

      {/* Footer */}
      <Text style={s.footer}>lumen.app</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: "#0B0F14",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#1A2233",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  brand: {
    color: "#F5C77A",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
  },
  weekBadge: {
    backgroundColor: "#1A2233",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekBadgeText: {
    color: "#AAB0C0",
    fontSize: 11,
    fontWeight: "600",
  },
  mainBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  daysNum: {
    color: "#F5C77A",
    fontSize: 80,
    fontWeight: "800",
    lineHeight: 88,
  },
  daysLabel: {
    color: "#AAB0C0",
    fontSize: 16,
    marginTop: 4,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dayCol: {
    alignItems: "center",
    gap: 5,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: "#F5C77A",
  },
  checkmark: {
    color: "#0B0F14",
    fontSize: 14,
    fontWeight: "700",
  },
  dayLabel: {
    color: "#3A4458",
    fontSize: 10,
    fontWeight: "600",
  },
  dayLabelActive: {
    color: "#F5C77A",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statEmoji: {
    fontSize: 13,
  },
  statText: {
    color: "#AAB0C0",
    fontSize: 12,
    fontWeight: "600",
  },
  tagline: {
    color: "#4A5568",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
    marginBottom: 20,
  },
  footer: {
    color: "#2A3448",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textAlign: "right",
  },
});
