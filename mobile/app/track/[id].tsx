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
import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
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
  onStart,
}: {
  lesson: LessonMeta;
  lang: Lang;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  const title = lesson.title[lang] ?? lesson.title.en ?? lesson.id;

  return (
    <Box className="bg-[#121826] border border-[#1A2233] rounded-[18px] p-4 mb-3">
      <HStack className="items-center justify-between">
        <VStack space="xs" className="flex-1 mr-3">
          <HStack className="items-center" space="sm">
            <DifficultyDot level={lesson.difficulty} />
            <Text className="text-[#E6EAF2] text-[15px] font-semibold flex-1">
              {title}
            </Text>
          </HStack>
          <Text className="text-[#7B8193] text-[12px]">
            {lesson.estimatedMinutes} {t("track.min")}
          </Text>
        </VStack>
        <Pressable
          onPress={onStart}
          className="px-4 h-[36px] rounded-xl bg-[#F5C77A] items-center justify-center"
        >
          <Text className="text-[#0B0F14] text-[13px] font-semibold">
            {t("track.start")}
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}

export default function TrackDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uid } = useAuth();
  const { getUserData } = useUser();

  const [track, setTrack] = useState<Track | null>(null);
  const [lessons, setLessons] = useState<LessonMeta[]>([]);
  const [lang, setLang] = useState<Lang>("pt");
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
    getUserData({ userId: uid }).then((u) => {
      if (u?.lang) setLang(u.lang);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const title = track?.title[lang] ?? track?.title.en ?? id;
  const color = trackColor(id as string);
  const bg = trackBg(id as string);

  function startLesson(lesson: LessonMeta) {
    router.push({
      pathname: "/(session)/lesson",
      params: { contentId: lesson.id, version: String(lesson.version), lang },
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
          lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              lang={lang}
              onStart={() => startLesson(lesson)}
            />
          ))
        )}
      </ScrollView>
    </Box>
  );
}
