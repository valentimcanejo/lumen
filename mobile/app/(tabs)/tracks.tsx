import React, { useEffect, useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View as RNView,
  ScrollView as HScrollView,
} from "react-native";
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
import {
  getCompletedContentIds,
  setSelectedTracks,
} from "../../repositories/user.repo";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { usePremium } from "../../hooks/usePremium";
import { SkeletonTrackCard } from "../../components/ui/lumen/Skeleton";
import { trackColor, trackBg } from "../../constants/tracks";
import type { Track } from "../../models/track";
import type { Lang } from "../../models/lang";
import { FEATURES, TEST_TRACKS } from "../../constants/config";

type FilterKey = "all" | "following" | "easy" | "medium" | "hard";

type ListItem =
  | { type: "section"; label: string; count?: number }
  | { type: "track"; track: Track; following: boolean };

const DIFF_COLORS = { 1: "#5ED19A", 2: "#F5C77A", 3: "#E26D6D" } as const;

function DifficultyBadge({
  level,
  muted,
}: {
  level: 1 | 2 | 3;
  muted?: boolean;
}) {
  const { t } = useTranslation();
  const labels = {
    1: t("tabs.tracks.difficulty_1"),
    2: t("tabs.tracks.difficulty_2"),
    3: t("tabs.tracks.difficulty_3"),
  };
  const color = muted ? "#3A4558" : DIFF_COLORS[level];
  const dotColor = muted ? "#2A3350" : DIFF_COLORS[level];
  return (
    <RNView style={[tc.diffBadge, { backgroundColor: color + "22" }]}>
      <RNView style={[tc.diffDot, { backgroundColor: dotColor }]} />
      <Text style={[tc.diffText, { color }]}>{labels[level]}</Text>
    </RNView>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <RNView style={tc.sectionHeader}>
      <Text style={tc.sectionLabel}>{label}</Text>
      {count !== undefined && (
        <RNView style={tc.sectionCountBadge}>
          <Text style={tc.sectionCount}>{count}</Text>
        </RNView>
      )}
    </RNView>
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
  const { t } = useTranslation();
  const [pressedFollow, setPressedFollow] = useState(false);
  const title = track.title[lang] ?? track.title.en ?? track.id;
  const description = track.description?.[lang] ?? track.description?.en;
  const color = trackColor(track.id);
  const bg = trackBg(track.id);
  const total = getLessonCountForTrack(track.id);
  const done = completedIds.filter((id) => id.startsWith(track.id)).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  if (isFollowing) {
    // ── Following card — colorful, compact ──────────────────────────────────
    return (
      <Pressable onPress={() => router.push(`/track/${track.id}`)}>
        <RNView
          style={[
            tc.card,
            {
              backgroundColor: bg,
              borderColor: color + "44",
              borderLeftColor: color + "80",
            },
          ]}
        >
          <RNView style={tc.headerRow}>
            <RNView
              style={[
                tc.iconBadge,
                { backgroundColor: color + "20", borderColor: color + "40" },
              ]}
            >
              <RNView style={[tc.iconDot, { backgroundColor: color }]} />
            </RNView>
            <Text style={tc.title} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onToggleFollow}
              onPressIn={() => setPressedFollow(true)}
              onPressOut={() => setPressedFollow(false)}
              disabled={!canUnfollow}
              hitSlop={10}
              style={{ opacity: !canUnfollow ? 0.35 : 1, flexShrink: 0 }}
            >
              <RNView
                style={[
                  tc.followingPill,
                  pressedFollow
                    ? { backgroundColor: "#E26D6D18", borderColor: "#E26D6D50" }
                    : {
                        backgroundColor: color + "18",
                        borderColor: color + "40",
                      },
                ]}
              >
                <Ionicons
                  name={pressedFollow ? "close" : "checkmark"}
                  size={11}
                  color={pressedFollow ? "#E26D6D" : color}
                />
                <Text
                  style={[
                    tc.followingText,
                    { color: pressedFollow ? "#E26D6D" : color },
                  ]}
                >
                  {pressedFollow
                    ? t("tabs.tracks.btn_unfollow")
                    : t("tabs.tracks.section_following")}
                </Text>
              </RNView>
            </TouchableOpacity>
          </RNView>

          <RNView style={tc.metaRow}>
            <DifficultyBadge level={track.difficulty} />
            {total > 0 && (
              <RNView style={tc.progressRow}>
                <RNView style={tc.progressTrack}>
                  <RNView
                    style={[
                      tc.progressFill,
                      { width: `${pct}%`, backgroundColor: color },
                    ]}
                  />
                </RNView>
                <Text
                  style={[
                    tc.progressLabel,
                    { color: done > 0 ? color : "#4A5568" },
                  ]}
                >
                  {done}/{total}
                </Text>
              </RNView>
            )}
          </RNView>
        </RNView>
      </Pressable>
    );
  }

  // ── Not following card — muted, shows description for discovery ────────────
  return (
    <Pressable onPress={() => router.push(`/track/${track.id}`)}>
      <RNView style={tc.cardMuted}>
        <RNView style={tc.headerRow}>
          <RNView style={tc.iconBadgeMuted}>
            <RNView style={tc.iconDotMuted} />
          </RNView>

          <RNView style={{ flex: 1 }}>
            <Text style={tc.titleMuted} numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text style={tc.descriptionMuted} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </RNView>

          <TouchableOpacity
            onPress={onToggleFollow}
            hitSlop={10}
            style={tc.followBtn}
          >
            <Ionicons name="add" size={13} color="#AAB0C0" />
            <Text style={tc.followBtnText}>{t("tabs.tracks.btn_follow")}</Text>
          </TouchableOpacity>
        </RNView>

        <RNView style={[tc.metaRow, { marginTop: description ? 10 : 10 }]}>
          <DifficultyBadge level={track.difficulty} muted />
          {total > 0 && <Text style={tc.lessonCount}>{total} lições</Text>}
        </RNView>
      </RNView>
    </Pressable>
  );
}

const tc = StyleSheet.create({
  // ── Following card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 8,
  },
  // ── Not-following card
  cardMuted: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1A2233",
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#0D111A",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconBadgeMuted: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E2A3E",
    backgroundColor: "#141B27",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  iconDotMuted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A3350",
  },
  title: {
    color: "#E6EAF2",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    lineHeight: 21,
    marginTop: 7,
  },
  titleMuted: {
    color: "#5A6478",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 7,
  },
  descriptionMuted: {
    color: "#3A4558",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  lessonCount: {
    color: "#2A3350",
    fontSize: 12,
    fontWeight: "600",
  },
  followingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  followingText: {
    fontSize: 11,
    fontWeight: "700",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#2A3350",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    flexShrink: 0,
  },
  followBtnText: {
    color: "#AAB0C0",
    fontSize: 11,
    fontWeight: "700",
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  diffDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  diffText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#1A2233",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "right",
  },
  // ── Section headers

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    color: "#AAB0C0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionCountBadge: {
    backgroundColor: "#1A2233",
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionCount: {
    color: "#7B8193",
    fontSize: 11,
    fontWeight: "700",
  },
});

const pb = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: "#111420",
    borderWidth: 1,
    borderColor: "#F5C77A33",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5C77A15",
    borderWidth: 1,
    borderColor: "#F5C77A30",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    color: "#E6EAF2",
    fontSize: 13,
    fontWeight: "700",
  },
  desc: {
    color: "#7B8193",
    fontSize: 12,
    marginTop: 2,
  },
  cta: {
    backgroundColor: "#F5C77A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  ctaText: {
    color: "#0B0F14",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default function Tracks() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { getUserData } = useUser();
  const { isPremium } = usePremium();
  const [tracks, setTracks] = useState<Track[]>([]);
  const { i18n } = useTranslation();
  const [lang, setLang] = useState<Lang>(
    () =>
      (["pt", "en", "es"].includes(i18n.language)
        ? i18n.language
        : "pt") as Lang,
  );
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
      if (user?.lang && !["pt", "en", "es"].includes(i18n.language))
        setLang(user.lang);
      setSelectedTrackIds(
        user?.selectedTrackIds ?? user?.selectedGoalIds ?? [],
      );
    });
    getCompletedContentIds(uid)
      .then(setCompletedIds)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Build the flat list items with section headers when not searching/filtering
  const listItems = useMemo((): ListItem[] => {
    const isSearching = search.trim().length > 0;
    const isFiltering = activeFilter !== "all";

    // Apply difficulty/following filter first
    let filtered = FEATURES.TEST_MODE ? tracks.filter((t) => TEST_TRACKS.includes(t.id)) : tracks;
    if (activeFilter === "following") {
      filtered = filtered.filter((t) => selectedTrackIds.includes(t.id));
    } else if (activeFilter === "easy") {
      filtered = filtered.filter((t) => t.difficulty === 1);
    } else if (activeFilter === "medium") {
      filtered = filtered.filter((t) => t.difficulty === 2);
    } else if (activeFilter === "hard") {
      filtered = filtered.filter((t) => t.difficulty === 3);
    }

    // Apply text search
    if (isSearching) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        const title = (t.title[lang] ?? t.title.en ?? "").toLowerCase();
        const desc = (
          t.description?.[lang] ??
          t.description?.en ??
          ""
        ).toLowerCase();
        const tags = (t.tags ?? []).join(" ").toLowerCase();
        return title.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    // Flat list when searching or filtering
    if (isSearching || isFiltering) {
      return filtered.map((track) => ({
        type: "track",
        track,
        following: selectedTrackIds.includes(track.id),
      }));
    }

    // Sectioned list: Following + Explore
    const following = filtered.filter((t) => selectedTrackIds.includes(t.id));
    const explore = filtered.filter((t) => !selectedTrackIds.includes(t.id));

    const items: ListItem[] = [];

    if (following.length > 0) {
      items.push({
        type: "section",
        label: t("tabs.tracks.section_following"),
        count: following.length,
      });
      following.forEach((track) =>
        items.push({ type: "track", track, following: true }),
      );
    }

    if (explore.length > 0) {
      items.push({
        type: "section",
        label: t("tabs.tracks.section_explore"),
        count: explore.length,
      });
      explore.forEach((track) =>
        items.push({ type: "track", track, following: false }),
      );
    }

    return items;
  }, [tracks, activeFilter, selectedTrackIds, search, lang, t]);

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

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("tabs.tracks.filter_all") },
    { key: "following", label: t("tabs.tracks.filter_following") },
    { key: "easy", label: t("tabs.tracks.difficulty_1") },
    { key: "medium", label: t("tabs.tracks.difficulty_2") },
    { key: "hard", label: t("tabs.tracks.difficulty_3") },
  ];

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
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
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
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonTrackCard key={i} />
          ))}
        </Box>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item, index) =>
            item.type === "section" ? `section-${index}` : item.track.id
          }
          renderItem={({ item }) => {
            if (item.type === "section") {
              return <SectionHeader label={item.label} count={item.count} />;
            }
            return (
              <TrackCard
                track={item.track}
                lang={lang}
                completedIds={completedIds}
                isFollowing={item.following}
                canUnfollow={selectedTrackIds.length > 1}
                onToggleFollow={() => handleToggleFollow(item.track.id)}
              />
            );
          }}
          ListHeaderComponent={
            FEATURES.PREMIUM && !isPremium ? (
              <Pressable
                onPress={() => router.push("/(premium)/paywall")}
                style={pb.wrap}
              >
                <RNView style={pb.iconWrap}>
                  <Ionicons name="sparkles" size={18} color="#F5C77A" />
                </RNView>
                <RNView style={{ flex: 1 }}>
                  <Text style={pb.title}>
                    {t("tabs.tracks.premium_banner_title")}
                  </Text>
                  <Text style={pb.desc}>
                    {t("tabs.tracks.premium_banner_desc")}
                  </Text>
                </RNView>
                <RNView style={pb.cta}>
                  <Text style={pb.ctaText}>
                    {t("tabs.tracks.premium_banner_cta")}
                  </Text>
                </RNView>
              </Pressable>
            ) : null
          }
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
