import React, { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { UserProfile } from "../../models/user";
import { PACKS } from "../../pack-mock";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

type Grade = "know" | "almost" | "dont";

function gradeLabel(g: Grade) {
  if (g === "know") return "Sei";
  if (g === "almost") return "Quase";
  return "Não sei";
}

export default function CardsScreen() {
  const { contentId, version } = useLocalSearchParams() as {
    contentId: string;
    version: string;
  };
  const [user, setUser] = useState<UserProfile | null>(null);
  const { getUserData } = useUser();
  const { uid } = useAuth();

  const lang = user?.lang ?? "pt";

  //   const { pack, loading, error } = usePack({
  //     contentId,
  //     version: Number(version),
  //     lang,
  //   });
  const pack = PACKS.find((p) => p.id === contentId);

  const cards = pack?.cards ?? [];
  const total = cards.length;

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = cards[index];

  const progressValue = useMemo(() => {
    if (!total) return 0.35;
    const stepStart = 0.25;
    const stepEnd = 0.5;
    const pct = index / Math.max(1, total);
    return stepStart + (stepEnd - stepStart) * pct;
  }, [index, total]);

  useEffect(() => {
    if (!uid) return;
    const fetchUserData = async () => {
      const userData = await getUserData({ userId: uid });
      setUser(userData || null);
    };
    fetchUserData();
  }, [uid]);

  function goNext() {
    setRevealed(false);
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= total) {
        router.push({
          pathname: "/(session)/quiz",
          params: { contentId, version },
        });
        return prev;
      }
      return next;
    });
  }

  function onGrade(g: Grade) {
    // TODO: salvar progresso local/remote por card (spaced repetition)
    // ex: progressRepo.gradeCard(uid, contentId, current.id, g)
    goNext();
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5 pt-14">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={progressValue} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            2 / 4
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">Cards</Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {pack?.lesson?.title ?? "Conteúdo"} •{" "}
          {total ? `${index + 1}/${total}` : ""}
        </Text>

        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      <Box className="flex-1 px-5 pt-5">
        {!pack || total === 0 ? (
          <VStack space="md" className="mt-3">
            <Text className="text-[#AAB0C0]">Não há cards nesse conteúdo.</Text>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/quiz",
                  params: { contentId, version },
                })
              }
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                Ir para Quiz
              </Text>
            </Pressable>
          </VStack>
        ) : (
          <>
            <Pressable
              onPress={() => setRevealed((v) => !v)}
              className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5 flex-1 justify-between"
            >
              <VStack space="md">
                <HStack className="items-center justify-between">
                  <HStack className="items-center" space="sm">
                    <Box className="w-[8px] h-[8px] rounded-full bg-[#F5C77A]" />
                    <Text className="text-[#AAB0C0] text-[12px]">
                      {revealed ? "VERSO" : "FRENTE"}
                    </Text>
                  </HStack>

                  <Text className="text-[#7B8193] text-[12px]">
                    toque para {revealed ? "ocultar" : "revelar"}
                  </Text>
                </HStack>

                <Text className="text-[#E6EAF2] text-[18px] font-semibold leading-[26px]">
                  {revealed ? current.back : current.front}
                </Text>

                {!revealed ? (
                  <Text className="text-[#7B8193] text-[13px] leading-[20px]">
                    Pense na resposta antes de revelar.
                  </Text>
                ) : (
                  <Text className="text-[#7B8193] text-[13px] leading-[20px]">
                    Agora avalie seu domínio e avance.
                  </Text>
                )}
              </VStack>

              <Box className="mt-4 h-[90px] rounded-[18px] bg-[#0E141E] border border-[#141C2A] overflow-hidden">
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
            </Pressable>

            <VStack space="sm" className="mt-4">
              <HStack space="sm">
                <Pressable
                  onPress={() => onGrade("know")}
                  className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                  style={{ backgroundColor: "#5ED19A" }}
                >
                  <Text className="text-[#0B0F14] text-[16px] font-semibold">
                    {gradeLabel("know")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onGrade("almost")}
                  className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                  style={{ backgroundColor: "#F0B86E" }}
                >
                  <Text className="text-[#0B0F14] text-[16px] font-semibold">
                    {gradeLabel("almost")}
                  </Text>
                </Pressable>
              </HStack>

              <Pressable
                onPress={() => onGrade("dont")}
                className="h-[52px] rounded-2xl items-center justify-center"
                style={{ backgroundColor: "#E26D6D" }}
              >
                <Text className="text-[#0B0F14] text-[16px] font-semibold">
                  {gradeLabel("dont")}
                </Text>
              </Pressable>

              <Pressable
                onPress={goNext}
                className="h-[52px] rounded-2xl border border-[#1A2233] items-center justify-center"
              >
                <Text className="text-[#AAB0C0] text-[16px] font-semibold">
                  Pular
                </Text>
              </Pressable>
            </VStack>
          </>
        )}
      </Box>
    </Box>
  );
}
