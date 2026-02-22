import React, { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { LessonBlocks } from "./_components/LessonBlocks";
import { PACKS } from "../../pack-mock";

// --- Mini componente: barra de progresso (topo) ---
function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

// --- Mini componente: waveform fake (visual) ---
function Waveform() {
  const bars = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => {
        const h = 8 + ((i * 13) % 22);
        const active = i < 10;
        return { h, active, i };
      }),
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
            b.active ? "bg-[#F5C77A]" : "bg-[#2A3448]",
          ].join(" ")}
        />
      ))}
    </HStack>
  );
}

export default function LessonScreen() {
  const [playing, setPlaying] = useState(false);

  const { contentId, version } = useLocalSearchParams() as {
    contentId: string;
    version: string;
  };

  const pack = PACKS.find((p) => p.id === contentId) as any;

  const stepLabel = "1 / 4";
  const progressValue = 0.22;

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
          {/* Title */}
          <Text className="text-[#E6EAF2] text-[22px] font-semibold">
            {pack.lesson.title}
          </Text>

          <Text className="text-[#AAB0C0] text-[13px] mt-1">
            {pack.tags?.[0] ?? "Lição"} • {pack.estimatedMinutes} min
          </Text>

          {/* divider */}
          <Box className="h-[1px] bg-[#1A2233] mt-4" />

          {/* Player card (visual por enquanto) */}
          <Box className="mt-5 bg-[#121826] border border-[#1A2233] rounded-[18px] p-4">
            <HStack className="items-center">
              <Pressable
                onPress={() => setPlaying((v) => !v)}
                className="w-[44px] h-[44px] rounded-full bg-[#1A2233] items-center justify-center border border-[#2A3448]"
              >
                <Ionicons
                  name={playing ? "pause" : "play"}
                  size={18}
                  color="#F5C77A"
                  style={{ marginLeft: playing ? 0 : 2 }}
                />
              </Pressable>

              <Waveform />

              <Text className="text-[#7B8193] text-[11px] w-[68px] text-right">
                01:12 / 04:08
              </Text>
            </HStack>

            <Box className="h-[4px] rounded-full bg-[#1A2233] overflow-hidden mt-3">
              <Box className="h-full bg-[#F5C77A]" style={{ width: "28%" }} />
            </Box>

            {pack.lesson.summary ? (
              <Text className="text-[#7B8193] text-[12px] mt-3">
                {pack.lesson.summary}
              </Text>
            ) : null}
          </Box>

          {/* Content from JSON blocks */}
          <LessonBlocks blocks={pack.lesson.blocks} />

          {/* subtle “stars” section */}
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

          {/* Bottom CTA */}
          <Box className="mt-6">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/cards",
                  params: {
                    contentId: pack.id,
                    version: String(pack.version),
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
              onPress={() => {
                // TODO: salvar/favoritar (ex: users/{uid}/saved/{contentId})
              }}
              className="h-[52px] rounded-2xl mt-3 border border-[#1A2233] items-center justify-center"
            >
              <Text className="text-[#AAB0C0] text-[16px] font-semibold">
                Salvar
              </Text>
            </Pressable>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
}
