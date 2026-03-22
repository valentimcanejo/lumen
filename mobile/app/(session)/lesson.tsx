import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
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
import type { Lang } from "../../models/lang";
import type { LessonBlock } from "../../models/pack";

const LANG_LOCALE: Record<Lang, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

function extractText(blocks: LessonBlock[]): string {
  return blocks
    .map((b) => (b.type === "bullets" ? b.items.join(". ") : b.text))
    .join(" ");
}

function estimateDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.round((words / 140) * 60 * 1000);
}

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  const ttsText = useMemo(
    () => (pack ? extractText(pack.lesson.blocks) : ""),
    [pack],
  );

  const durationMs = useMemo(() => estimateDurationMs(ttsText), [ttsText]);
  const audioProgress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

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
    return () => {
      Speech.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function stopSpeech() {
    Speech.stop();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
  }

  function handlePlayPause() {
    if (playing) {
      stopSpeech();
    } else {
      setPositionMs(0);
      setPlaying(true);

      const tickMs = 250;
      const id = setInterval(() => {
        Speech.isSpeakingAsync().then((speaking) => {
          if (speaking) {
            setPositionMs((prev) => Math.min(prev + tickMs, durationMs));
          }
        });
      }, tickMs);
      intervalRef.current = id;

      Speech.speak(ttsText, {
        language: LANG_LOCALE[lang ?? "pt"],
        onDone: () => {
          clearInterval(id);
          intervalRef.current = null;
          setPositionMs(durationMs);
          setPlaying(false);
        },
        onStopped: () => {
          clearInterval(id);
          intervalRef.current = null;
          setPlaying(false);
        },
        onError: () => {
          clearInterval(id);
          intervalRef.current = null;
          setPlaying(false);
        },
      });
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

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={0.22} />

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
              <Pressable
                onPress={handlePlayPause}
                className="w-[44px] h-[44px] rounded-full bg-[#1A2233] items-center justify-center border border-[#2A3448]"
                style={({ pressed }: { pressed: boolean }) => ({
                  opacity: pressed ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.93 : 1 }],
                })}
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
                {`${formatMs(positionMs)} / ${formatMs(durationMs)}`}
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
                  color={saved ? "#F5C77A" : "#AAB0C0"}
                />
                <Text
                  className="text-[16px] font-semibold"
                  style={{ color: saved ? "#F5C77A" : "#AAB0C0" }}
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
