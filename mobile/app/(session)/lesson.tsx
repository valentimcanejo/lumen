import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio, AVPlaybackStatus } from "expo-av";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

import { LessonBlocks } from "./_components/LessonBlocks";
import { usePack } from "../../hooks/usePack";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { toggleSaveContent } from "../../repositories/user.repo";
import { getStorageDownloadUrl } from "../../services/storage.service";
import type { Lang } from "../../models/lang";

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
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
  const { contentId, version, lang } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
  };

  const { uid } = useAuth();
  const { getUserData } = useUser();
  const { pack, loading, error } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  // Audio
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const audioProgress = durationMs > 0 ? positionMs / durationMs : 0;

  // Save
  const [saved, setSaved] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  useEffect(() => {
    if (!uid || !contentId) return;
    getUserData({ userId: uid }).then((user) => {
      setSaved(user?.savedContentIds?.includes(contentId) ?? false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, contentId]);

  useEffect(() => {
    const audioUrl = pack?.lesson?.audioUrl;
    if (!audioUrl) return;

    let alive = true;
    let loadedSound: Audio.Sound | null = null;

    async function load() {
      const url = audioUrl!.startsWith("https://")
        ? audioUrl!
        : await getStorageDownloadUrl(audioUrl!);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false },
        (status: AVPlaybackStatus) => {
          if (!alive || !status.isLoaded) return;
          setPositionMs(status.positionMillis);
          setDurationMs(status.durationMillis ?? 0);
          if (status.didJustFinish) setPlaying(false);
        },
      );

      if (alive) {
        soundRef.current = sound;
        loadedSound = sound;
      } else {
        sound.unloadAsync();
      }
    }

    load().catch(() => {});

    return () => {
      alive = false;
      loadedSound?.unloadAsync();
      soundRef.current = null;
    };
  }, [pack?.lesson?.audioUrl]);

  async function handlePlayPause() {
    const s = soundRef.current;
    if (!s) return;
    if (playing) {
      await s.pauseAsync();
      setPlaying(false);
    } else {
      await s.playAsync();
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

  const stepLabel = "1 / 4";
  const progressValue = 0.22;

  if (loading) {
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center">
        <Text className="text-[#AAB0C0]">Carregando…</Text>
      </Box>
    );
  }

  if (error || !pack) {
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center px-6">
        <Text className="text-[#E26D6D] text-center">
          {error ?? "Conteúdo não encontrado."}
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-[#AAB0C0]">Voltar</Text>
        </Pressable>
      </Box>
    );
  }

  const hasAudio = !!pack.lesson.audioUrl;

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5 pt-14">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={progressValue} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            {stepLabel}
          </Text>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <Box className="px-5 pt-6">
          <Text className="text-[#E6EAF2] text-[22px] font-semibold">
            {pack.lesson.title}
          </Text>

          <Text className="text-[#AAB0C0] text-[13px] mt-1">
            {pack.tags?.[0] ?? "Lição"} • {pack.estimatedMinutes} min
          </Text>

          <Box className="h-[1px] bg-[#1A2233] mt-4" />

          <Box className="mt-5 bg-[#121826] border border-[#1A2233] rounded-[18px] p-4">
            <HStack className="items-center">
              <Pressable
                onPress={handlePlayPause}
                disabled={!hasAudio}
                className="w-[44px] h-[44px] rounded-full bg-[#1A2233] items-center justify-center border border-[#2A3448]"
                style={{ opacity: hasAudio ? 1 : 0.4 }}
              >
                <Ionicons
                  name={playing ? "pause" : "play"}
                  size={18}
                  color="#F5C77A"
                  style={{ marginLeft: playing ? 0 : 2 }}
                />
              </Pressable>

              <Waveform progress={audioProgress} />

              <Text className="text-[#7B8193] text-[11px] w-[68px] text-right">
                {hasAudio
                  ? `${formatMs(positionMs)} / ${formatMs(durationMs)}`
                  : "--:-- / --:--"}
              </Text>
            </HStack>

            <Box className="h-[4px] rounded-full bg-[#1A2233] overflow-hidden mt-3">
              <Box
                className="h-full bg-[#F5C77A]"
                style={{ width: `${audioProgress * 100}%` }}
              />
            </Box>

            {pack.lesson.summary ? (
              <Text className="text-[#7B8193] text-[12px] mt-3">
                {pack.lesson.summary}
              </Text>
            ) : null}
          </Box>

          <LessonBlocks blocks={pack.lesson.blocks} />

          <Box className="mt-6 h-[140px] rounded-[18px] bg-[#0E141E] border border-[#141C2A] overflow-hidden">
            <Box className="absolute inset-0 bg-black/10" />
            <Box className="absolute -bottom-10 left-0 right-0 h-[120px] bg-black/35" />
            <HStack className="absolute bottom-10 left-5" space="xs">
              {Array.from({ length: 18 }).map((_, i) => (
                <Box
                  key={i}
                  className="w-[3px] h-[3px] rounded-full bg-[#AAB0C0]/20"
                />
              ))}
            </HStack>
          </Box>

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
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                Próximo
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
                  color={saved ? "#F5C77A" : "#AAB0C0"}
                />
                <Text
                  className="text-[16px] font-semibold"
                  style={{ color: saved ? "#F5C77A" : "#AAB0C0" }}
                >
                  {saved ? "Salvo" : "Salvar"}
                </Text>
              </HStack>
            </Pressable>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
}
