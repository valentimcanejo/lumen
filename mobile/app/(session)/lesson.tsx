import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { Box } from "../../components/ui/box";
import { Pressable } from "../../components/ui/pressable";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { ScrollView } from "react-native";
import { LumenButton } from "../../components/ui/lumen/Button";
import { LumenCard } from "../../components/ui/lumen/Card";
import { useTranslation } from "react-i18next";

import { Ionicons } from "@expo/vector-icons";

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
        // alturas pseudo-aleatórias determinísticas
        const h = 8 + ((i * 13) % 22);
        const active = i < 10; // simula parte "tocada"
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

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      {/* Top bar */}
      <Box className="px-5 pt-14">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={0.22} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            1 / 4
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
            O Equilíbrio de Poder
          </Text>
          <Text className="text-[#AAB0C0] text-[13px] mt-1">
            Geopolítica • 8 min
          </Text>

          {/* subtle divider */}
          <Box className="h-[1px] bg-[#1A2233] mt-4" />

          {/* Player card */}
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
          </Box>

          {/* Content */}
          <Text className="text-[#E6EAF2] text-[16px] font-semibold mt-6">
            O que é, afinal, o equilíbrio de poder?
          </Text>

          <Text className="text-[#AAB0C0] text-[14px] leading-[22px] mt-3">
            O equilíbrio de poder é a ideia de que nenhuma nação deve se tornar
            forte demais a ponto de dominar outras.
          </Text>

          <Text className="text-[#AAB0C0] text-[14px] leading-[22px] mt-3">
            Quando um país cresce rápido, outros podem reagir com alianças,
            contenção ou reforço militar — não por “amizade”, mas para evitar
            que o poder fique concentrado.
          </Text>

          {/* subtle “stars” fade section like the mock */}
          <Box className="mt-6 h-[140px] rounded-[18px] bg-[#0E141E] border border-[#141C2A] overflow-hidden">
            <Box className="absolute inset-0 bg-black/10" />
            <Box className="absolute -bottom-10 left-0 right-0 h-[120px] bg-black/35" />
            {/* pontinhos */}
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
              //onPress={() => router.push("/(session)/cards")}
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                Próximo
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                /* salvar / marcar depois */
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
