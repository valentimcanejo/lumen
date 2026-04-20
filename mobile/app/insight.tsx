import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useAuth } from "../hooks/useAuth";
import { markInsightRead } from "../repositories/insights.repo";
import { trackColor } from "../constants/tracks";

export default function InsightScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();

  // Insight passed as JSON string via params
  const { data } = useLocalSearchParams<{ data: string }>();
  const insight = data ? JSON.parse(data) : null;

  useEffect(() => {
    if (uid && insight?.id && !insight.read) {
      markInsightRead(uid, insight.id).catch(() => {});
    }
  }, [uid, insight?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!insight) return null;

  const primaryColor = insight.trackIds?.[0] ? trackColor(insight.trackIds[0]) : "#7B8FE0";

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
        </TouchableOpacity>
        <Text style={s.headerLabel}>{t("insight.label")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {/* Title */}
        <View style={[s.titleCard, { borderLeftColor: primaryColor }]}>
          <Text style={s.title}>{insight.title}</Text>
          <Text style={s.intro}>{insight.intro}</Text>
        </View>

        {/* Connections */}
        {insight.connections?.map((c: { headline: string; body: string }, i: number) => {
          const color = insight.trackIds?.[i % insight.trackIds.length]
            ? trackColor(insight.trackIds[i % insight.trackIds.length])
            : primaryColor;
          return (
            <View key={i} style={[s.connectionCard, { borderLeftColor: color }]}>
              <Text style={[s.connectionHeadline, { color }]}>{c.headline}</Text>
              <Text style={s.connectionBody}>{c.body}</Text>
            </View>
          );
        })}

        {/* Takeaway */}
        {insight.takeaway ? (
          <View style={s.takeawayCard}>
            <Text style={s.takeawayIcon}>💡</Text>
            <Text style={s.takeaway}>{insight.takeaway}</Text>
          </View>
        ) : null}
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
  headerLabel: { color: "#AAB0C0", fontSize: 13, fontWeight: "600" },
  scroll: { paddingHorizontal: 16, gap: 12 },
  titleCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    borderLeftWidth: 3,
    padding: 20,
  },
  title: { color: "#E6EAF2", fontSize: 20, fontWeight: "700", lineHeight: 26, letterSpacing: -0.3, marginBottom: 10 },
  intro: { color: "#AAB0C0", fontSize: 14, lineHeight: 21 },
  connectionCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    borderLeftWidth: 3,
    padding: 16,
  },
  connectionHeadline: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  connectionBody: { color: "#AAB0C0", fontSize: 13, lineHeight: 20 },
  takeawayCard: {
    flexDirection: "row",
    backgroundColor: "#1A1408",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F5C77A25",
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  takeawayIcon: { fontSize: 18, marginTop: 1 },
  takeaway: { color: "#F5C77A", fontSize: 13, fontWeight: "600", lineHeight: 20, flex: 1 },
});
