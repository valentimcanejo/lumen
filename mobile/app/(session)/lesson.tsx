import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Linking,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

import { LessonBlocks } from "./_components/LessonBlocks";
import { SessionError } from "./_components/SessionError";
import { usePack } from "../../hooks/usePack";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { toggleSaveContent } from "../../repositories/user.repo";
import { trackColor } from "../../constants/tracks";
import { getCoverImage } from "../../constants/covers";
import { getLessonMeta } from "../../repositories/lessons.repo";
import { CoverImage } from "../../components/ui/lumen/CoverImage";
import { getStorageDownloadUrl } from "../../services/storage.service";
import { generateAudio } from "../../services/functions.service";
import type { Lang } from "../../models/lang";
import type { LessonBlock } from "../../models/pack";

function extractText(blocks: LessonBlock[]): string {
  return blocks
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .join(" ");
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function TopProgress({
  value,
  color = "#F5C77A",
}: {
  value: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

function Waveform({ progress = 0, color }: { progress?: number; color: string }) {
  const bars = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({ h: 8 + ((i * 13) % 22), i })),
    [],
  );

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 10,
        overflow: "hidden",
        gap: 3,
      }}
    >
      {bars.map((b) => (
        <View
          key={b.i}
          style={{
            width: 3,
            height: b.h,
            borderRadius: 2,
            backgroundColor: b.i / 28 < progress ? color : "#2A3448",
          }}
        />
      ))}
    </View>
  );
}

function SpinningLoader({ color }: { color: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="sync-outline" size={18} color={color} />
    </Animated.View>
  );
}

function PackLoadingScreen({ color }: { color: string }) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Simulate loading: ramp to 80% quickly, then slow crawl to 93%
    progress.value = withSequence(
      withTiming(0.8, { duration: 900, easing: Easing.out(Easing.cubic) }),
      withTiming(0.93, { duration: 3000, easing: Easing.out(Easing.quad) }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={ld.screen}>
      <View style={ld.center}>
        {/* Icon badge */}
        <View
          style={[
            ld.iconBadge,
            { borderColor: color + "40", backgroundColor: color + "12" },
          ]}
        >
          <Ionicons name="book-outline" size={28} color={color} />
        </View>

        <Text style={ld.label}>{t("session.lesson.loading")}</Text>

        {/* Progress bar */}
        <View style={ld.barTrack}>
          <Animated.View
            style={[ld.barFill, barStyle, { backgroundColor: color }]}
          />
          {/* Shimmer head */}
          <Animated.View
            style={[ld.barHead, barStyle, { shadowColor: color }]}
          />
        </View>
      </View>
    </View>
  );
}

const ld = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0F14",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 48,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    color: "#7B8193",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  barTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1A2233",
    overflow: "hidden",
    position: "relative",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    borderRadius: 2,
  },
  barHead: {
    position: "absolute",
    right: 0,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.8,
    elevation: 4,
  },
});

export default function LessonScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentId, version, lang } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
  };

  const lessonMeta = getLessonMeta(contentId);
  const color = trackColor(lessonMeta?.trackId ?? contentId);

  const { uid } = useAuth();
  const { getUserData } = useUser();
  const { pack, loading, error } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Refs para o slider — lidos dentro do PanResponder (criado uma vez)
  const audioReadyRef = useRef(false);
  audioReadyRef.current = audioReady;
  const durationMsRef = useRef(0);
  durationMsRef.current = durationMs;
  const isDragging = useRef(false);
  const dragPositionMs = useRef(0);
  const progressBarRef = useRef<View>(null);
  const progressBarLayout = useRef({ x: 0, width: 1 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => audioReadyRef.current,
      onMoveShouldSetPanResponder: () => audioReadyRef.current,
      onPanResponderGrant: (e) => {
        if (!soundRef.current || durationMsRef.current === 0) return;
        isDragging.current = true;
        const fraction = Math.max(
          0,
          Math.min(
            1,
            (e.nativeEvent.pageX - progressBarLayout.current.x) /
              progressBarLayout.current.width,
          ),
        );
        const ms = Math.round(fraction * durationMsRef.current);
        dragPositionMs.current = ms;
        setPositionMs(ms);
      },
      onPanResponderMove: (e) => {
        if (!soundRef.current || durationMsRef.current === 0) return;
        const fraction = Math.max(
          0,
          Math.min(
            1,
            (e.nativeEvent.pageX - progressBarLayout.current.x) /
              progressBarLayout.current.width,
          ),
        );
        const ms = Math.round(fraction * durationMsRef.current);
        dragPositionMs.current = ms;
        setPositionMs(ms);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        soundRef.current?.setPositionAsync(dragPositionMs.current);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        soundRef.current?.setPositionAsync(dragPositionMs.current);
      },
    }),
  ).current;

  const audioProgress =
    durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  const [saved, setSaved] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  // Load bookmarked state
  useEffect(() => {
    if (!uid || !contentId) return;
    getUserData({ userId: uid }).then((user) => {
      setSaved(user?.savedContentIds?.includes(contentId) ?? false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, contentId]);

  // Set audio mode once on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  // Prepare audio when pack is ready
  useEffect(() => {
    if (!pack || !uid) return;
    let cancelled = false;

    async function prepareAudio() {
      setAudioLoading(true);
      const storagePath = `packs/${contentId}/v${version}/audio/${lang}_gpt.mp3`;

      try {
        let url: string;
        try {
          url = await getStorageDownloadUrl(storagePath);
        } catch (e) {
          // Audio not yet generated — call Cloud Function with extracted text, then retry
          const text = extractText(pack.lesson.blocks);

          await generateAudio({
            contentId,
            version: Number(version),
            lang,
            text,
          });
          url = await getStorageDownloadUrl(storagePath);
        }

        if (cancelled) return;

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false },
        );

        if (cancelled) {
          sound.unloadAsync();
          return;
        }

        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (!isDragging.current) setPositionMs(status.positionMillis);
          if (status.durationMillis) setDurationMs(status.durationMillis);
          if (status.didJustFinish) {
            setPlaying(false);
            setPositionMs(0);
          }
        });

        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setDurationMs(status.durationMillis);
        }

        setAudioReady(true);
      } catch (e) {
        console.warn("[lesson] Audio preparation failed:", e);
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    }

    prepareAudio();

    return () => {
      cancelled = true;
    };
  }, [pack, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function handlePlayPause() {
    if (!soundRef.current || !audioReady) return;
    if (playing) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setPlaying(true);
    }
  }

  async function handleSeekToFraction(fraction: number) {
    if (!soundRef.current || !audioReady || durationMs === 0) return;
    const next = Math.round(fraction * durationMs);
    await soundRef.current.setPositionAsync(next);
    setPositionMs(next);
  }

  async function handleNext() {
    if (soundRef.current && playing) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
    }
    router.replace({
      pathname: "/(session)/quiz",
      params: { contentId, version, lang },
    });
  }

  async function handleSave() {
    if (!uid) return;
    const newSaved = !saved;
    setSavingContent(true);
    try {
      await toggleSaveContent(uid, contentId, newSaved);
      setSaved(newSaved);
    } finally {
      setSavingContent(false);
    }
  }

  if (loading) {
    return <PackLoadingScreen color={color} />;
  }

  if (error || !pack) {
    return <SessionError message={error ?? undefined} />;
  }

  const playIconName = playing ? "pause" : "play";
  const showLoadingIcon = audioLoading;

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={0.22} color={color} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            {t("session.lesson.step")}
          </Text>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 16, 32),
        }}
      >
        {/* Hero cover image — full bleed */}
        {(() => {
          const coverUri = lessonMeta?.coverImageUrl;
          const coverLocal = getCoverImage(contentId);
          if (coverUri) {
            return (
              <CoverImage
                uri={coverUri}
                credit={lessonMeta?.coverImageCredit}
                width="100%"
                height={230}
              />
            );
          }
          if (coverLocal) return <Image source={coverLocal} style={ls.heroImage} resizeMode="cover" />;
          return (
            <View style={[ls.heroPlaceholder, { backgroundColor: color + "20" }]}>
              <Ionicons name="book-outline" size={44} color={color} />
            </View>
          );
        })()}

        <View style={ls.content}>
          {/* Title + meta below the hero */}
          <Text style={ls.lessonTitle} numberOfLines={2}>{pack.lesson.title}</Text>
          <Text style={ls.lessonMeta}>
            {pack.tags?.[0] ?? t("common.content")} • {pack.estimatedMinutes} min
          </Text>

          <View style={ls.divider} />

          {/* Audio player */}
          <View
            style={[
              ls.playerCard,
              { borderColor: color + "30", borderLeftColor: color + "70" },
            ]}
          >
            <View style={ls.playerRow}>
              <TouchableOpacity
                onPress={handlePlayPause}
                activeOpacity={0.65}
                disabled={!audioReady}
                style={[
                  as.playBtn,
                  {
                    borderColor: color + "55",
                    backgroundColor: color + "15",
                    opacity: audioReady ? 1 : 0.4,
                  },
                ]}
              >
                {showLoadingIcon ? (
                  <SpinningLoader color={color} />
                ) : (
                  <Ionicons
                    name={playIconName}
                    size={18}
                    color={color}
                    style={{ marginLeft: playing ? 0 : 2 }}
                  />
                )}
              </TouchableOpacity>

              <Waveform progress={audioProgress} color={color} />

              <Text style={ls.timeLabel}>
                {audioReady
                  ? `${formatMs(positionMs)} / ${formatMs(durationMs)}`
                  : audioLoading
                    ? t("common.loading")
                    : "--:-- / --:--"}
              </Text>
            </View>

            <View
              ref={progressBarRef}
              onLayout={() => {
                progressBarRef.current?.measureInWindow((x, _y, width) => {
                  progressBarLayout.current = { x, width: width || 1 };
                });
              }}
              {...panResponder.panHandlers}
              style={ls.progressHitArea}
            >
              <View style={ls.progressTrack}>
                <View
                  style={[
                    ls.progressFill,
                    { width: `${audioProgress * 100}%`, backgroundColor: color },
                  ]}
                />
                {audioReady && (
                  <View
                    style={[
                      ls.progressThumb,
                      { left: `${audioProgress * 100}%` as any, backgroundColor: color },
                    ]}
                  />
                )}
              </View>
            </View>

            {pack.lesson.summary ? (
              <Text style={ls.summaryText}>{pack.lesson.summary}</Text>
            ) : null}

            {audioReady && (
              <View style={ls.audioHint}>
                <Ionicons name="headset-outline" size={13} color="#4A5568" />
                <Text style={ls.audioHintText}>
                  {t("session.lesson.audio_hint")}
                </Text>
              </View>
            )}
          </View>

          <LessonBlocks blocks={pack.lesson.blocks} />

          <View style={ls.actions}>
            <Pressable
              onPress={handleNext}
              style={[ls.nextBtn, { backgroundColor: color }]}
            >
              <Text style={ls.nextBtnText}>{t("common.next")}</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={savingContent}
              style={[ls.saveBtn, { opacity: savingContent ? 0.6 : 1 }]}
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={saved ? color : "#AAB0C0"}
              />
              <Text
                style={[ls.saveBtnText, { color: saved ? color : "#AAB0C0" }]}
              >
                {saved ? t("common.saved") : t("common.save")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Box>
  );
}

const as = StyleSheet.create({
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const ls = StyleSheet.create({
  heroImage: {
    width: "100%",
    height: 230,
  },
  heroPlaceholder: {
    width: "100%",
    height: 230,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  lessonTitle: {
    color: "#E6EAF2",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  lessonMeta: {
    color: "#AAB0C0",
    fontSize: 13,
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A2233",
    marginTop: 16,
  },
  playerCard: {
    marginTop: 20,
    backgroundColor: "#121826",
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 18,
    padding: 16,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeLabel: {
    color: "#7B8193",
    fontSize: 11,
    width: 68,
    textAlign: "right",
  },
  progressHitArea: {
    marginTop: 12,
    height: 28,
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1A2233",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
  },
  summaryText: {
    color: "#7B8193",
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  audioHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  audioHintText: {
    color: "#4A5568",
    fontSize: 12,
  },
  actions: {
    marginTop: 24,
    gap: 10,
    marginBottom: 8,
  },
  nextBtn: {
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    color: "#0B0F14",
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtn: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
