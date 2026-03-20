import React, { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { useAuth } from "../../hooks/useAuth";
import { markDayCompleted, updateStreak } from "../../repositories/progress.repo";
import { todayYmd } from "../../repositories/session.repo";
import { usePack } from "../../hooks/usePack";
import type { Lang } from "../../models/lang";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SummaryScreen() {
  const { contentId, version, lang, correct, total } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
    correct?: string;
    total?: string;
  };

  const { pack } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  const correctN = Number(correct ?? 0);
  const totalN = Number(total ?? 0);
  const scorePct = totalN > 0 ? clamp(correctN / totalN, 0, 1) : 0;

  const { uid } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const scoreLabel = useMemo(() => {
    if (totalN === 0) return "Sessão concluída";
    if (scorePct >= 0.85) return "Excelente";
    if (scorePct >= 0.6) return "Muito bom";
    if (scorePct >= 0.35) return "Bom começo";
    return "Continue";
  }, [scorePct, totalN]);

  async function onFinish() {
    setSaving(true);
    try {
      if (uid) {
        const date = todayYmd();
        await markDayCompleted(uid, date, {
          contentId,
          contentVersion: Number(version),
          minutes: pack?.estimatedMinutes ?? 0,
          quizScore: totalN > 0 ? correctN / totalN : 1,
        });
        await updateStreak(uid, date);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function goHome() {
    router.replace("/(tabs)/home");
  }

  function nextContent() {
    // const { nextContentId, nextVersion } = await getNextContent(...)
    // router.replace({ pathname:"/(session)/lesson", params:{contentId: nextContentId, version: String(nextVersion)} })
    router.replace("/(tabs)/home");
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5 pt-14">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={0.95} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            4 / 4
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">Resumo</Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {pack?.lesson?.title ?? "Sessão"} • {pack?.estimatedMinutes ?? 0} min
        </Text>

        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      <Box className="flex-1 px-5 pt-5">
        <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
          <HStack className="items-center justify-between">
            <VStack space="xs">
              <Text className="text-[#AAB0C0] text-[12px]">DESEMPENHO</Text>
              <Text className="text-[#E6EAF2] text-[18px] font-semibold">
                {scoreLabel}
              </Text>
              {totalN > 0 ? (
                <Text className="text-[#7B8193] text-[13px] mt-1">
                  {correctN} / {totalN} corretas
                </Text>
              ) : (
                <Text className="text-[#7B8193] text-[13px] mt-1">
                  Quiz pulado
                </Text>
              )}
            </VStack>

            <Box className="w-[64px] h-[64px] rounded-full bg-[#0E141E] border border-[#1A2233] items-center justify-center">
              <Text className="text-[#F5C77A] text-[18px] font-semibold">
                {totalN > 0 ? Math.round(scorePct * 100) : 100}%
              </Text>
            </Box>
          </HStack>

          <Box className="h-[6px] rounded-full bg-[#1A2233] overflow-hidden mt-4">
            <Box
              className="h-full bg-[#F5C77A]"
              style={{ width: `${(totalN > 0 ? scorePct : 1) * 100}%` }}
            />
          </Box>

          <Box className="mt-4">
            <Text className="text-[#AAB0C0] text-[12px]">INSIGHT</Text>
            <Text className="text-[#E6EAF2] text-[14px] leading-[22px] mt-2">
              Você consolidou os conceitos principais. Amanhã, uma revisão curta
              ajuda a fixar ainda mais.
            </Text>
          </Box>
        </Box>

        <Box className="mt-5 h-[140px] rounded-[18px] bg-[#0E141E] border border-[#141C2A] overflow-hidden">
          <Box className="absolute inset-0 bg-black/10" />
          <Box className="absolute -bottom-10 left-0 right-0 h-[120px] bg-black/35" />
          <HStack className="absolute bottom-10 left-5" space="xs">
            {Array.from({ length: 22 }).map((_, i) => (
              <Box
                key={i}
                className="w-[3px] h-[3px] rounded-full bg-[#AAB0C0]/20"
              />
            ))}
          </HStack>
        </Box>

        <VStack space="sm" className="pb-6 mt-auto">
          <Pressable
            onPress={onFinish}
            disabled={saving || saved}
            className={[
              "h-[52px] rounded-2xl items-center justify-center",
              saved ? "bg-[#5ED19A]" : "bg-[#F5C77A]",
            ].join(" ")}
          >
            <Text
              className={[
                "text-[16px] font-semibold",
                saved ? "text-[#0B0F14]" : "text-[#0B0F14]",
              ].join(" ")}
            >
              {saved ? "Concluído" : saving ? "Salvando…" : "Concluir"}
            </Text>
          </Pressable>

          <Pressable
            onPress={nextContent}
            className="h-[52px] rounded-2xl border border-[#1A2233] items-center justify-center"
          >
            <Text className="text-[#AAB0C0] text-[16px] font-semibold">
              Próximo conteúdo
            </Text>
          </Pressable>

          <Pressable
            onPress={goHome}
            className="h-[52px] rounded-2xl border border-[#1A2233] items-center justify-center"
          >
            <Text className="text-[#AAB0C0] text-[16px] font-semibold">
              Voltar para Home
            </Text>
          </Pressable>
        </VStack>
      </Box>
    </Box>
  );
}
