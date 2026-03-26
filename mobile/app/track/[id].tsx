import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";

import { getTracks } from "../../repositories/tracks.repo";
import {
  getLessonsByTrack,
  type LessonMeta,
} from "../../repositories/lessons.repo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { getCompletedContentIds } from "../../repositories/user.repo";
import { SkeletonLessonRow } from "../../components/ui/lumen/Skeleton";
import { trackColor, trackBg } from "../../constants/tracks";
import type { Track } from "../../models/track";
import type { Lang } from "../../models/lang";

function DifficultyDot({ level }: { level: 1 | 2 | 3 }) {
  const colors = { 1: "#5ED19A", 2: "#F5C77A", 3: "#E26D6D" };
  return (
    <Box
      className="w-[8px] h-[8px] rounded-full"
      style={{ backgroundColor: colors[level] }}
    />
  );
}

function LessonCard({
  lesson,
  lang,
  completed,
  locked,
  color,
  onStart,
}: {
  lesson: LessonMeta;
  lang: Lang;
  completed: boolean;
  locked: boolean;
  color: string;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  const title = lesson.title[lang] ?? lesson.title.en ?? lesson.id;

  return (
    <Box
      className="rounded-[18px] p-4 mb-3"
      style={{
        backgroundColor: locked ? "#0B0F14" : completed ? "#0D1A10" : "#121826",
        borderWidth: 1,
        borderColor: locked ? "#1A2233" : completed ? `${color}44` : "#1A2233",
        opacity: locked ? 0.6 : 1,
      }}
    >
      <HStack className="items-center justify-between">
        <VStack space="xs" className="flex-1 mr-3">
          <HStack className="items-center" space="sm">
            {locked
              ? <Ionicons name="lock-closed" size={13} color="#4A5568" />
              : <DifficultyDot level={lesson.difficulty} />
            }
            <Text className="text-[#E6EAF2] text-[15px] font-semibold flex-1">
              {title}
            </Text>
          </HStack>
          <HStack className="items-center" space="xs">
            <Text className="text-[#7B8193] text-[12px]">
              {lesson.estimatedMinutes} {t("track.min")}
            </Text>
            {completed && !locked && (
              <>
                <Text className="text-[#7B8193] text-[12px]">·</Text>
                <Ionicons name="checkmark-circle" size={13} color={color} />
                <Text style={{ color, fontSize: 12 }}>{t("track.completed")}</Text>
              </>
            )}
          </HStack>
        </VStack>
        {!locked && (
          <Pressable
            onPress={onStart}
            style={{
              paddingHorizontal: 14,
              height: 36,
              borderRadius: 12,
              backgroundColor: completed ? "transparent" : color,
              borderWidth: completed ? 1 : 0,
              borderColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: completed ? color : "#0B0F14",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {completed ? t("track.review") : t("track.start")}
            </Text>
          </Pressable>
        )}
      </HStack>
    </Box>
  );
}

export default function TrackDetailScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uid } = useAuth();

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
      <Box
        className="px-5 pb-5"
        style={{ paddingTop: insets.top + 8, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: `${color}33` }}
      >
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={color} />
          </Pressable>
          <HStack className="items-center flex-1" space="sm">
            <Box style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
            <Text className="text-[#E6EAF2] text-[20px] font-semibold flex-1">
              {title}
            </Text>
          </HStack>
        </HStack>
        {track?.description?.[lang] ? (
          <Text className="text-[#AAB0C0] text-[13px] mt-3 ml-8">
            {track.description[lang]}
          </Text>
        ) : null}
        <Text className="text-[12px] font-semibold mt-3 ml-8" style={{ color }}>
          {lessons.length} {t("track.lessons")}
        </Text>
      </Box>

      {/* Mastery banner */}
      {isTrackMastered && (
        <Box className="px-5 pt-4">
          <Box
            className="rounded-[18px] p-4"
            style={{ backgroundColor: `${color}18`, borderWidth: 1.5, borderColor: `${color}55` }}
          >
            <HStack className="items-start" space="sm">
              <Ionicons name="trophy" size={20} color={color} style={{ marginTop: 1 }} />
              <VStack space="xs" className="flex-1">
                <Text className="text-[#E6EAF2] text-[15px] font-semibold">
                  {t("track.mastered_title")}
                </Text>
                <Text className="text-[13px] leading-[19px]" style={{ color: `${color}CC` }}>
                  {track?.description?.[lang] ?? track?.description?.en ?? t("track.mastered_fallback")}
                </Text>
              </VStack>
            </HStack>
          </Box>
        </Box>
      )}

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
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
            return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              lang={lang}
              completed={completedIds.includes(lesson.id)}
              locked={locked}
              color={color}
              onStart={() => startLesson(lesson)}
            />
            );
          })
        )}
      </ScrollView>
    </Box>
  );
}
