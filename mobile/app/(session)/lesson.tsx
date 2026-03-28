import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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

function Waveform({ progress = 0 }: { progress?: number }) {
  const bars = useMemo(
    () => Array.from({ length: 28 }).map((_, i) => ({ h: 8 + ((i * 13) % 22), i })),
    [],
  );

  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 10, overflow: "hidden", gap: 3 }}>
      {bars.map((b) => (
        <View
          key={b.i}
          style={{
            width: 3,
            height: b.h,
            borderRadius: 2,
            backgroundColor: b.i / 28 < progress ? "#F5C77A" : "#2A3448",
          }}
        />
      ))}
    </View>
  );
}

export default function LessonScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentId, version, lang } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
  };

  const color = trackColor(contentId);

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
      const storagePath = `packs/${contentId}/v${version}/audio/${lang}.mp3`;

      try {
        let url: string;
        try {
          url = await getStorageDownloadUrl(storagePath);
        } catch (e) {
          // Audio not yet generated — call Cloud Function with extracted text, then retry
          const text = extractText(pack.lesson.blocks);
          console.log(text);
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
          setPositionMs(status.positionMillis);
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
  }, [pack, uid]);

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
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center">
        <Text className="text-[#AAB0C0]">{t("common.loading")}</Text>
      </Box>
    );
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
        {(() => {
          const cover = getCoverImage(contentId);
          return cover ? (
            <View style={ls.coverWrap}>
              <Image source={cover} style={ls.coverImage} resizeMode="cover" />
              <View style={ls.coverFade} />
            </View>
          ) : null;
        })()}

        <View style={ls.content}>
          <Text style={ls.lessonTitle}>{pack.lesson.title}</Text>
          <Text style={ls.lessonMeta}>
            {pack.tags?.[0] ?? t("common.content")} • {pack.estimatedMinutes} min
          </Text>

          <View style={ls.divider} />

          {/* Audio player */}
          <View style={[ls.playerCard, { borderColor: color + "30", borderLeftColor: color + "70" }]}>
            <View style={ls.playerRow}>
              <TouchableOpacity
                onPress={handlePlayPause}
                activeOpacity={0.65}
                disabled={!audioReady}
                style={[as.playBtn, { borderColor: color + "55", backgroundColor: color + "15", opacity: audioReady ? 1 : 0.4 }]}
              >
                {showLoadingIcon ? (
                  <Ionicons name="hourglass-outline" size={18} color={color} />
                ) : (
                  <Ionicons name={playIconName} size={18} color={color} style={{ marginLeft: playing ? 0 : 2 }} />
                )}
              </TouchableOpacity>

              <Waveform progress={audioProgress} />

              <Text style={ls.timeLabel}>
                {audioReady
                  ? `${formatMs(positionMs)} / ${formatMs(durationMs)}`
                  : audioLoading
                    ? t("common.loading")
                    : "--:-- / --:--"}
              </Text>
            </View>

            <View style={ls.progressTrack}>
              <View style={[ls.progressFill, { width: `${audioProgress * 100}%`, backgroundColor: color }]} />
            </View>

            {pack.lesson.summary ? (
              <Text style={ls.summaryText}>{pack.lesson.summary}</Text>
            ) : null}

            {audioReady && (
              <View style={ls.audioHint}>
                <Ionicons name="headset-outline" size={13} color="#4A5568" />
                <Text style={ls.audioHintText}>{t("session.lesson.audio_hint")}</Text>
              </View>
            )}
          </View>

          <LessonBlocks blocks={pack.lesson.blocks} />

          <View style={ls.actions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/cards",
                  params: { contentId: pack.id, version: String(pack.version), lang },
                })
              }
              style={[ls.nextBtn, { backgroundColor: color }]}
            >
              <Text style={ls.nextBtnText}>{t("common.next")}</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={savingContent}
              style={[ls.saveBtn, { opacity: savingContent ? 0.6 : 1 }]}
            >
              <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={18} color={saved ? color : "#AAB0C0"} />
              <Text style={[ls.saveBtnText, { color: saved ? color : "#AAB0C0" }]}>
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
  coverWrap: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: 200,
  },
  coverFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "#0B0F1490",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  lessonTitle: {
    color: "#E6EAF2",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  lessonMeta: {
    color: "#AAB0C0",
    fontSize: 13,
    marginTop: 4,
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
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1A2233",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
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
