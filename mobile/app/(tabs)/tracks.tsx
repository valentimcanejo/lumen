import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";
import { getTracks } from "../../repositories/tracks.repo";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { useAiPack } from "../../hooks/useAiPack";
import type { Track } from "../../models/track";
import type { Lang } from "../../models/lang";

function DifficultyBadge({ level }: { level: 1 | 2 | 3 }) {
  const labels = { 1: "Iniciante", 2: "Intermediário", 3: "Avançado" };
  const colors = { 1: "#5ED19A", 2: "#F5C77A", 3: "#E26D6D" };
  return (
    <Box
      className="px-2 py-1 rounded-full"
      style={{ backgroundColor: `${colors[level]}22` }}
    >
      <Text className="text-[11px] font-medium" style={{ color: colors[level] }}>
        {labels[level]}
      </Text>
    </Box>
  );
}

function TrackCard({ track, lang }: { track: Track; lang: Lang }) {
  const title = track.title[lang] ?? track.title.en ?? track.id;
  const description = track.description?.[lang] ?? track.description?.en ?? "";

  return (
    <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5 mb-3">
      <HStack className="items-start justify-between mb-2">
        <Text className="text-[#E6EAF2] text-[17px] font-semibold flex-1 mr-3">
          {title}
        </Text>
        <DifficultyBadge level={track.difficulty} />
      </HStack>

      {description ? (
        <Text className="text-[#AAB0C0] text-[13px] leading-[20px]">
          {description}
        </Text>
      ) : null}

      {track.tags?.length > 0 && (
        <HStack className="mt-3 flex-wrap" space="xs">
          {track.tags.map((tag) => (
            <Box
              key={tag}
              className="px-2 py-1 rounded-full bg-[#1A2233]"
            >
              <Text className="text-[#7B8193] text-[11px]">{tag}</Text>
            </Box>
          ))}
        </HStack>
      )}
    </Box>
  );
}

export default function Tracks() {
  const { uid } = useAuth();
  const { getUserData } = useUser();
  const { generate, loading: generating } = useAiPack();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    getTracks()
      .then(setTracks)
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((user) => {
      if (user?.lang) setLang(user.lang);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function handleGenerate() {
    setAiError(null);
    try {
      const pack = await generate({ lang, minutes: 10 });
      if (pack) {
        router.push({
          pathname: "/(session)/lesson",
          params: { contentId: pack.id, version: String(pack.version), lang },
        });
      }
    } catch {
      setAiError("Não foi possível gerar o conteúdo. Tente novamente.");
    }
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-6 pt-14 pb-4">
        <Text className="text-[#E6EAF2] text-[22px] font-bold">Trilhas</Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          Explore os temas disponíveis
        </Text>
      </Box>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* AI Pack */}
        <Box className="bg-[#121826] border border-[#F5C77A]/30 rounded-[22px] p-5 mb-5">
          <HStack className="items-center mb-2" space="sm">
            <Ionicons name="sparkles" size={16} color="#F5C77A" />
            <Text className="text-[#F5C77A] text-[12px] font-semibold">
              PREMIUM · IA
            </Text>
          </HStack>
          <Text className="text-[#E6EAF2] text-[16px] font-semibold">
            Gerar conteúdo com IA
          </Text>
          <Text className="text-[#AAB0C0] text-[13px] mt-1 leading-[20px]">
            Crie uma sessão personalizada no seu idioma com conteúdo gerado sob
            demanda.
          </Text>
          {aiError ? (
            <Text className="text-[#E26D6D] text-[12px] mt-3">{aiError}</Text>
          ) : null}
          <Pressable
            onPress={handleGenerate}
            disabled={generating}
            className="mt-4 h-[44px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            style={{ opacity: generating ? 0.6 : 1 }}
          >
            <Text className="text-[#0B0F14] text-[15px] font-semibold">
              {generating ? "Gerando…" : "Gerar sessão"}
            </Text>
          </Pressable>
        </Box>

        {/* Track list */}
        {loading ? (
          <Text className="text-[#AAB0C0] text-center mt-6">Carregando…</Text>
        ) : tracks.length === 0 ? (
          <Text className="text-[#AAB0C0] text-center mt-6">
            Nenhuma trilha disponível.
          </Text>
        ) : (
          tracks.map((track) => (
            <TrackCard key={track.id} track={track} lang={lang} />
          ))
        )}
      </ScrollView>
    </Box>
  );
}
