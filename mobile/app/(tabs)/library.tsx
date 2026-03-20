import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { useAuth } from "../../hooks/useAuth";
import {
  getRecentSessions,
  type CompletedSession,
} from "../../repositories/progress.repo";

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "#5ED19A" : pct >= 60 ? "#F5C77A" : "#E26D6D";
  return (
    <Box
      className="w-[42px] h-[42px] rounded-full items-center justify-center border"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}18` }}
    >
      <Text className="text-[12px] font-semibold" style={{ color }}>
        {pct}%
      </Text>
    </Box>
  );
}

function SessionRow({ session }: { session: CompletedSession }) {
  const date = new Date(session.completedAt);
  const dateLabel = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <Box className="bg-[#121826] border border-[#1A2233] rounded-[18px] p-4 mb-3">
      <HStack className="items-center justify-between">
        <VStack space="xs" className="flex-1 mr-3">
          <Text className="text-[#E6EAF2] text-[14px] font-semibold">
            {session.contentId}
          </Text>
          <HStack space="md">
            <Text className="text-[#7B8193] text-[12px]">{dateLabel}</Text>
            <Text className="text-[#7B8193] text-[12px]">
              {session.minutes} min
            </Text>
          </HStack>
        </VStack>
        <ScoreBadge score={session.quizScore} />
      </HStack>
    </Box>
  );
}

export default function Library() {
  const { uid } = useAuth();
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getRecentSessions(uid)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [uid]);

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-6 pt-14 pb-4">
        <Text className="text-[#E6EAF2] text-[22px] font-bold">Biblioteca</Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          Seu histórico de sessões
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
        ) : sessions.length === 0 ? (
          <VStack className="items-center mt-10" space="sm">
            <Text className="text-[#E6EAF2] text-[16px] font-semibold">
              Nenhuma sessão concluída ainda
            </Text>
            <Text className="text-[#7B8193] text-[13px] text-center">
              Complete sua primeira sessão para ver o histórico aqui.
            </Text>
          </VStack>
        ) : (
          sessions.map((s) => <SessionRow key={s.date} session={s} />)
        )}
      </ScrollView>
    </Box>
  );
}
