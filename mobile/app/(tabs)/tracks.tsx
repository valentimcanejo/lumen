import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { getTracks } from "../../repositories/tracks.repo";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
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
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);

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
  }, [uid]);

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
        {loading ? (
          <Text className="text-[#AAB0C0] text-center mt-10">
            Carregando…
          </Text>
        ) : tracks.length === 0 ? (
          <Text className="text-[#AAB0C0] text-center mt-10">
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
