import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View as RNView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

import { getTracks } from "../../repositories/tracks.repo";
import {
  getLessonsByTrack,
  type LessonMeta,
} from "../../repositories/lessons.repo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { usePremium } from "../../hooks/usePremium";
import { getCompletedContentIds } from "../../repositories/user.repo";
import { SkeletonLessonRow } from "../../components/ui/lumen/Skeleton";
import { trackColor, trackBg } from "../../constants/tracks";
import type { Track } from "../../models/track";
import type { Lang } from "../../models/lang";

const DIFF_COLORS: Record<number, string> = { 1: "#5ED19A", 2: "#F5C77A", 3: "#E26D6D" };

function LessonCard({
  lesson,
  lang,
  completed,
  locked,
  premiumLocked,
  color,
  onStart,
  onUnlock,
}: {
  lesson: LessonMeta;
  lang: Lang;
  completed: boolean;
  locked: boolean;        // locked by prerequisites
  premiumLocked: boolean; // locked by premium tier
  color: string;
  onStart: () => void;
  onUnlock: () => void;
}) {
  const { t } = useTranslation();
  const title = lesson.title[lang] ?? lesson.title.en ?? lesson.id;
  const diffColor = DIFF_COLORS[lesson.difficulty] ?? "#AAB0C0";

  const cardBg = locked ? "#0B0F14" : premiumLocked ? "#111420" : completed ? "#0D1A10" : "#121826";
  const borderColor = locked ? "#1A2233" : premiumLocked ? "#F5C77A33" : completed ? color + "44" : "#1A2233";
  const accentColor = locked ? "#1A2233" : premiumLocked ? "#F5C77A55" : completed ? color + "70" : color + "50";
  const iconBg = locked ? "#1A2233" : premiumLocked ? "#F5C77A15" : completed ? color + "20" : color + "15";
  const iconBorderColor = locked ? "#2A3448" : premiumLocked ? "#F5C77A40" : completed ? color + "40" : color + "30";

  return (
    <RNView
      style={[
        lc.card,
        {
          backgroundColor: cardBg,
          borderColor,
          borderLeftColor: accentColor,
          opacity: locked ? 0.55 : 1,
        },
      ]}
    >
      {/* Icon badge */}
      <RNView style={[lc.iconBadge, { backgroundColor: iconBg, borderColor: iconBorderColor }]}>
        {locked
          ? <Ionicons name="lock-closed" size={15} color="#4A5568" />
          : premiumLocked
            ? <Ionicons name="sparkles" size={15} color="#F5C77A" />
            : completed
              ? <Ionicons name="checkmark" size={16} color={color} />
              : <Ionicons name="book-outline" size={16} color={color} />
        }
      </RNView>

      {/* Text */}
      <RNView style={lc.textCol}>
        <RNView style={lc.titleRow}>
          <Text style={lc.cardTitle} numberOfLines={2}>{title}</Text>
          {premiumLocked && (
            <RNView style={lc.premiumBadge}>
              <Text style={lc.premiumBadgeText}>{t("track.premium_badge")}</Text>
            </RNView>
          )}
        </RNView>
        <RNView style={lc.metaRow}>
          <RNView style={[lc.diffDot, { backgroundColor: diffColor }]} />
          <Text style={lc.metaText}>{lesson.estimatedMinutes} {t("track.min")}</Text>
          {completed && !locked && !premiumLocked && (
            <>
              <RNView style={lc.metaDivider} />
              <Text style={[lc.metaText, { color }]}>{t("track.completed")}</Text>
            </>
          )}
        </RNView>
      </RNView>

      {/* Action */}
      {!locked && (
        <Pressable
          onPress={premiumLocked ? onUnlock : onStart}
          style={[
            lc.actionBtn,
            premiumLocked
              ? { backgroundColor: "#F5C77A", borderWidth: 0 }
              : {
                  backgroundColor: completed ? "transparent" : color,
                  borderColor: color,
                  borderWidth: completed ? 1 : 0,
                },
          ]}
        >
          <Text style={[lc.actionText, { color: premiumLocked ? "#0B0F14" : completed ? color : "#0B0F14" }]}>
            {premiumLocked
              ? t("track.premium_unlock")
              : completed
                ? t("track.review")
                : t("track.start")}
          </Text>
        </Pressable>
      )}
    </RNView>
  );
}

export default function TrackDetailScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uid } = useAuth();
  const { isPremium } = usePremium();

  const lang = (i18n.language ?? "pt") as Lang;
  const [track, setTrack] = useState<Track | null>(null);
  const [lessons, setLessons] = useState<LessonMeta[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getTracks().catch(() => [] as Track[]),
      getLessonsByTrack(id).catch(() => [] as LessonMeta[]),
    ]).then(([tracks, l]) => {
      setTrack(tracks.find((t) => t.id === id) ?? null);
      setLessons(l);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!uid) return;
    getCompletedContentIds(uid)
      .then(setCompletedIds)
      .catch(() => {});
  }, [uid]);

  const title = track?.title[lang] ?? track?.title.en ?? id;
  const color = trackColor(id as string);
  const bg = trackBg(id as string);
  const doneLessons = completedIds.filter((c) => c.startsWith(id as string)).length;
  const isTrackMastered = !loading && lessons.length > 0 && doneLessons >= lessons.length;

  function startLesson(lesson: LessonMeta) {
    router.push({
      pathname: "/(session)/intro",
      params: {
        contentId: lesson.id,
        version: String(lesson.version),
        lang,
        title: lesson.title[lang] ?? lesson.title.en ?? lesson.id,
        difficulty: String(lesson.difficulty),
        estimatedMinutes: String(lesson.estimatedMinutes),
      },
    });
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      {/* Header */}
      <RNView
        style={[
          th.header,
          { paddingTop: insets.top + 8, backgroundColor: bg, borderBottomColor: color + "30" },
        ]}
      >
        {/* Decorative ring */}
        <RNView style={[th.ring, { borderColor: color + "18" }]} />

        <RNView style={th.backRow}>
          <Pressable onPress={() => router.back()} style={th.backBtn}>
            <Ionicons name="chevron-back" size={22} color={color} />
          </Pressable>
        </RNView>

        <RNView style={[th.trackBadge, { backgroundColor: color + "20", borderColor: color + "40" }]}>
          <RNView style={[th.trackDot, { backgroundColor: color }]} />
          <Text style={[th.trackBadgeText, { color }]}>{t("track.track_label")}</Text>
        </RNView>

        <Text style={th.headerTitle} numberOfLines={2}>{title}</Text>

        {track?.description?.[lang] ? (
          <Text style={th.headerDesc} numberOfLines={2}>{track.description[lang]}</Text>
        ) : null}

        <Text style={[th.lessonCount, { color }]}>
          {lessons.length} {t("track.lessons")}
        </Text>
      </RNView>

      {/* Mastery banner */}
      {isTrackMastered && (
        <RNView style={th.masteryWrap}>
          <RNView style={[th.masteryCard, { backgroundColor: color + "15", borderColor: color + "50" }]}>
            <Ionicons name="trophy" size={20} color={color} style={{ marginTop: 1 }} />
            <RNView style={{ flex: 1, gap: 3 }}>
              <Text style={th.masteryTitle}>{t("track.mastered_title")}</Text>
              <Text style={[th.masteryDesc, { color: color + "CC" }]}>
                {track?.description?.[lang] ?? track?.description?.en ?? t("track.mastered_fallback")}
              </Text>
            </RNView>
          </RNView>
        </RNView>
      )}

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom + 16, 32) }}
      >
        {loading ? (
          [0, 1, 2].map((i) => (
            <Box key={i} className="mb-2">
              <SkeletonLessonRow />
            </Box>
          ))
        ) : lessons.length === 0 ? (
          <Text className="text-[#AAB0C0] text-center mt-10">
            {t("track.empty")}
          </Text>
        ) : (
          lessons.map((lesson) => {
            const locked = lesson.prerequisites.some((p) => !completedIds.includes(p));
            const premiumLocked = lesson.tier === "premium" && !isPremium;
            return (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                lang={lang}
                completed={completedIds.includes(lesson.id)}
                locked={locked}
                premiumLocked={premiumLocked}
                color={color}
                onStart={() => startLesson(lesson)}
                onUnlock={() => router.push("/(premium)/paywall")}
              />
            );
          })
        )}
      </ScrollView>
    </Box>
  );
}

const th = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    bottom: -130,
    right: -80,
  },
  backRow: { marginBottom: 16 },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  trackBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 12,
  },
  trackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trackBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#E6EAF2",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  headerDesc: {
    color: "#AAB0C0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  lessonCount: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    letterSpacing: 0.3,
  },
  masteryWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  masteryCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  masteryTitle: {
    color: "#E6EAF2",
    fontSize: 15,
    fontWeight: "700",
  },
  masteryDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
});

const lc = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  cardTitle: {
    color: "#E6EAF2",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    flexShrink: 1,
  },
  premiumBadge: {
    backgroundColor: "#F5C77A22",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#F5C77A44",
  },
  premiumBadgeText: {
    color: "#F5C77A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  metaText: {
    color: "#7B8193",
    fontSize: 12,
    fontWeight: "500",
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2A3448",
  },
  actionBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
