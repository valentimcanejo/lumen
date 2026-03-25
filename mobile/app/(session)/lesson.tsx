import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
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
import { getStorageDownloadUrl } from "../../services/storage.service";
import { generateAudio } from "../../services/functions.service";
import type { Lang } from "../../models/lang";

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function TopProgress({ value, color = "#F5C77A" }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color }} />
    </Box>
  );
}

function Waveform({ progress = 0 }: { progress?: number }) {
  const bars = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        h: 8 + ((i * 13) % 22),
        i,
      })),
    [],
  );

  return (
    <HStack className="items-center justify-center flex-1 mx-3" space="xs">
      {bars.map((b) => (
        <Box
          key={b.i}
          style={{ height: b.h }}
          className={[
            "w-[3px] rounded-full",
            b.i / 36 < progress ? "bg-[#F5C77A]" : "bg-[#2A3448]",
          ].join(" ")}
        />
      ))}
    </HStack>
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

  const audioProgress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

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
      staysActiveInBackground: false,
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
        } catch {
          // Audio not yet generated — call Cloud Function then retry
          await generateAudio({ contentId, version: Number(version), lang });
          url = await getStorageDownloadUrl(storagePath);
        }

        if (cancelled) return;

        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: false });

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
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
      >
        <Box className="px-5 pt-6">
          <Text className="text-[#E6EAF2] text-[22px] font-semibold">
            {pack.lesson.title}
          </Text>

          <Text className="text-[#AAB0C0] text-[13px] mt-1">
            {pack.tags?.[0] ?? t("common.content")} • {pack.estimatedMinutes} min
          </Text>

          <Box className="h-[1px] bg-[#1A2233] mt-4" />

          <Box className="mt-5 bg-[#121826] border border-[#1A2233] rounded-[18px] p-4">
            <HStack className="items-center">
              <TouchableOpacity
                onPress={handlePlayPause}
                activeOpacity={0.65}
                disabled={!audioReady}
                style={[as.playBtn, { borderColor: `${color}55`, opacity: audioReady ? 1 : 0.4 }]}
              >
                {showLoadingIcon ? (
                  <Ionicons name="hourglass-outline" size={18} color={color} />
                ) : (
                  <Ionicons
                    name={playIconName}
                    size={18}
                    color={color}
                    style={{ marginLeft: playing ? 0 : 2 }}
                  />
                )}
              </TouchableOpacity>

              <Waveform progress={audioProgress} />

              <Text className="text-[#7B8193] text-[11px] w-[68px] text-right">
                {audioReady
                  ? `${formatMs(positionMs)} / ${formatMs(durationMs)}`
                  : audioLoading
                    ? t("common.loading")
                    : "--:-- / --:--"}
              </Text>
            </HStack>

            <Box className="h-[4px] rounded-full bg-[#1A2233] overflow-hidden mt-3">
              <Box
                style={{ height: "100%", width: `${audioProgress * 100}%`, backgroundColor: color }}
              />
            </Box>

            {pack.lesson.summary ? (
              <Text className="text-[#7B8193] text-[12px] mt-3">
                {pack.lesson.summary}
              </Text>
            ) : null}
          </Box>

          <LessonBlocks blocks={pack.lesson.blocks} />

          <Box className="mt-6">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/cards",
                  params: {
                    contentId: pack.id,
                    version: String(pack.version),
                    lang,
                  },
                })
              }
              style={{ height: 52, borderRadius: 18, backgroundColor: color, alignItems: "center", justifyContent: "center" }}
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {t("common.next")}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={savingContent}
              className="h-[52px] rounded-2xl mt-3 border border-[#1A2233] items-center justify-center"
              style={{ opacity: savingContent ? 0.6 : 1 }}
            >
              <HStack className="items-center" space="sm">
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={saved ? color : "#AAB0C0"}
                />
                <Text
                  className="text-[16px] font-semibold"
                  style={{ color: saved ? color : "#AAB0C0" }}
                >
                  {saved ? t("common.saved") : t("common.save")}
                </Text>
              </HStack>
            </Pressable>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
}

const as = StyleSheet.create({
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A2233",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
