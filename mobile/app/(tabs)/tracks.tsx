import React, { useEffect, useState, useMemo } from "react";
import { FlatList, TextInput, TouchableOpacity, ScrollView as HScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";
import { getTracks } from "../../repositories/tracks.repo";
import { getLessonCountForTrack } from "../../repositories/lessons.repo";
import { getCompletedContentIds, setSelectedTracks } from "../../repositories/user.repo";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { useAiPack } from "../../hooks/useAiPack";
import { SkeletonTrackCard } from "../../components/ui/lumen/Skeleton";
import { trackColor, trackBg } from "../../constants/tracks";
import type { Track } from "../../models/track";
import type { Lang } from "../../models/lang";

type FilterKey = "all" | "following" | "easy" | "medium" | "hard";

function DifficultyBadge({ level }: { level: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const labels = {
    1: t("tabs.tracks.difficulty_1"),
    2: t("tabs.tracks.difficulty_2"),
    3: t("tabs.tracks.difficulty_3"),
  };
  const colors = { 1: "#5ED19A", 2: "#F5C77A", 3: "#E26D6D" };
  return (
    <Box
      className="px-2 py-1 rounded-full"
      style={{ backgroundColor: `${colors[level]}22` }}
    >
      <Text className="text-[11px] font-medium" style={{ color: colors[level] }}>
        {labels[level]}
      </Text>
    </Box>
  );
}

function TrackCard({
  track,
  lang,
  completedIds,
  isFollowing,
  canUnfollow,
  onToggleFollow,
}: {
  track: Track;
  lang: Lang;
  completedIds: string[];
  isFollowing: boolean;
  canUnfollow: boolean;
  onToggleFollow: () => void;
}) {
  const title = track.title[lang] ?? track.title.en ?? track.id;
  const color = trackColor(track.id);
  const bg = trackBg(track.id);
  const total = getLessonCountForTrack(track.id);
  const done = completedIds.filter((id) => id.startsWith(track.id)).length;

  return (
    <Pressable onPress={() => router.push(`/track/${track.id}`)}>
      <Box
        className="rounded-[18px] p-3 mb-2"
        style={{ backgroundColor: bg, borderWidth: 1, borderColor: `${color}44` }}
      >
        <HStack className="items-center justify-between">
          <HStack className="items-center flex-1 mr-2" space="sm">
            <Box
              style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: color, flexShrink: 0,
              }}
            />
            <Text
              className="text-[#E6EAF2] text-[15px] font-semibold flex-1"
              numberOfLines={1}
            >
              {title}
            </Text>
          </HStack>
          <HStack className="items-center" space="xs">
            <DifficultyBadge level={track.difficulty} />
            <TouchableOpacity
              onPress={onToggleFollow}
              disabled={isFollowing && !canUnfollow}
              hitSlop={10}
              style={{ opacity: isFollowing && !canUnfollow ? 0.35 : 1 }}
            >
              <Ionicons
                name={isFollowing ? "checkmark-circle" : "add-circle-outline"}
                size={20}
                color={isFollowing ? color : "#4A5568"}
              />
            </TouchableOpacity>
          </HStack>
        </HStack>

        {total > 0 && (
          <HStack className="items-center mt-2" space="sm">
            <Box className="flex-1 h-[2px] rounded-full bg-[#1A2233] overflow-hidden">
              <Box
                style={{
                  height: "100%",
                  width: total > 0 ? `${(done / total) * 100}%` : "0%",
                  backgroundColor: color,
                  borderRadius: 99,
                }}
              />
            </Box>
            <Text
              style={{
                color: done > 0 ? color : "#7B8193",
                fontSize: 11,
                fontWeight: "600",
                minWidth: 28,
                textAlign: "right",
              }}
            >
              {done}/{total}
            </Text>
          </HStack>
        )}
      </Box>
    </Pressable>
  );
}

export default function Tracks() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { getUserData } = useUser();
  const { generate, loading: generating, error: aiPackError } = useAiPack(uid);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    getTracks()
      .then(setTracks)
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((user) => {
      if (user?.lang) setLang(user.lang);
      setSelectedTrackIds(user?.selectedTrackIds ?? user?.selectedGoalIds ?? []);
    });
    getCompletedContentIds(uid).then(setCompletedIds).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const filteredTracks = useMemo(() => {
    let result = tracks;
    if (activeFilter === "following") {
      result = result.filter((t) => selectedTrackIds.includes(t.id));
    } else if (activeFilter === "easy") {
      result = result.filter((t) => t.difficulty === 1);
    } else if (activeFilter === "medium") {
      result = result.filter((t) => t.difficulty === 2);
    } else if (activeFilter === "hard") {
      result = result.filter((t) => t.difficulty === 3);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((t) => {
        const title = (t.title[lang] ?? t.title.en ?? "").toLowerCase();
        const tags = (t.tags ?? []).join(" ").toLowerCase();
        return title.includes(q) || tags.includes(q);
      });
    }
    return result;
  }, [tracks, activeFilter, selectedTrackIds, search, lang]);

  async function handleToggleFollow(trackId: string) {
    if (!uid) return;
    const isFollowing = selectedTrackIds.includes(trackId);
    if (isFollowing && selectedTrackIds.length <= 1) return;
    const next = isFollowing
      ? selectedTrackIds.filter((id) => id !== trackId)
      : [...selectedTrackIds, trackId];
    setSelectedTrackIds(next);
    await setSelectedTracks(uid, next);
  }

  async function handleGenerate() {
    const pack = await generate({ lang, minutes: 10 });
    if (pack) {
      router.push({
        pathname: "/(session)/lesson",
        params: { contentId: pack.id, version: String(pack.version), lang },
      });
    }
  }

  const aiErrorMessage =
    aiPackError === "not-premium"
      ? t("tabs.tracks.ai_error_not_premium")
      : aiPackError === "premium-expired"
        ? t("tabs.tracks.ai_error_expired")
        : aiPackError === "rate-limited"
          ? t("tabs.tracks.ai_error_rate_limited")
          : aiPackError === "unknown"
            ? t("tabs.tracks.ai_error_unknown")
            : null;

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("tabs.tracks.filter_all") },
    { key: "following", label: t("tabs.tracks.filter_following") },
    { key: "easy", label: t("tabs.tracks.difficulty_1") },
    { key: "medium", label: t("tabs.tracks.difficulty_2") },
    { key: "hard", label: t("tabs.tracks.difficulty_3") },
  ];

  const aiPackCard = (
    <Box className="bg-[#121826] border border-[#F5C77A]/30 rounded-[22px] p-5 mb-4">
      <HStack className="items-center mb-2" space="sm">
        <Ionicons name="sparkles" size={16} color="#F5C77A" />
        <Text className="text-[#F5C77A] text-[12px] font-semibold">
          {t("tabs.tracks.ai_badge")}
        </Text>
      </HStack>
      <Text className="text-[#E6EAF2] text-[16px] font-semibold">
        {t("tabs.tracks.ai_title")}
      </Text>
      <Text className="text-[#AAB0C0] text-[13px] mt-1 leading-[20px]">
        {t("tabs.tracks.ai_description")}
      </Text>
      {aiErrorMessage ? (
        <Text className="text-[#E26D6D] text-[12px] mt-3">{aiErrorMessage}</Text>
      ) : null}
      <Pressable
        onPress={handleGenerate}
        disabled={generating}
        className="mt-4 h-[44px] rounded-2xl bg-[#F5C77A] items-center justify-center"
        style={{ opacity: generating ? 0.6 : 1 }}
      >
        <Text className="text-[#0B0F14] text-[15px] font-semibold">
          {generating ? t("tabs.tracks.ai_generating") : t("tabs.tracks.ai_generate")}
        </Text>
      </Pressable>
    </Box>
  );

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      {/* Static header */}
      <Box className="px-6 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-[#E6EAF2] text-[22px] font-bold">
          {t("tabs.tracks.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {t("tabs.tracks.subtitle")}
        </Text>

        {/* Search bar */}
        <HStack
          className="mt-3 bg-[#121826] border border-[#1A2233] rounded-[14px] px-3 h-[40px] items-center"
          space="sm"
        >
          <Ionicons name="search" size={16} color="#4A5568" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("tabs.tracks.search_placeholder")}
            placeholderTextColor="#4A5568"
            style={{ flex: 1, color: "#E6EAF2", fontSize: 14 }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#4A5568" />
            </TouchableOpacity>
          ) : null}
        </HStack>
      </Box>

      {/* Filter pills */}
      <HScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 10 }}
      >
        <HStack space="xs">
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveFilter(key)}
                className="h-[30px] px-3 rounded-full items-center justify-center"
                style={{
                  backgroundColor: active ? "#7B8FE0" : "#121826",
                  borderWidth: 1,
                  borderColor: active ? "#7B8FE0" : "#1A2233",
                }}
              >
                <Text
                  className="text-[12px] font-semibold"
                  style={{ color: active ? "#0B0F14" : "#7B8193" }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </HScrollView>

      {/* Track list */}
      {loading ? (
        <Box className="px-6">
          {[0, 1, 2, 3, 4].map((i) => <SkeletonTrackCard key={i} />)}
        </Box>
      ) : (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item: track }) => (
            <TrackCard
              track={track}
              lang={lang}
              completedIds={completedIds}
              isFollowing={selectedTrackIds.includes(track.id)}
              canUnfollow={selectedTrackIds.length > 1}
              onToggleFollow={() => handleToggleFollow(track.id)}
            />
          )}
          ListHeaderComponent={aiPackCard}
          ListEmptyComponent={
            <Text className="text-[#AAB0C0] text-center mt-6">
              {tracks.length === 0
                ? t("tabs.tracks.empty")
                : t("tabs.tracks.no_results")}
            </Text>
          }
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Box>
  );
}
