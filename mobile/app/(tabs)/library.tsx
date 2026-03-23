import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";

import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import {
  getRecentSessions,
  type CompletedSession,
} from "../../repositories/progress.repo";
import { getLessonMeta } from "../../repositories/lessons.repo";
import { trackColor } from "../../constants/tracks";
import type { Lang } from "../../models/lang";

const DATE_LOCALE: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

// ---------------------------------------------------------------------------
// History tab components
// ---------------------------------------------------------------------------

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

function SessionRow({
  session,
  locale,
  lang,
}: {
  session: CompletedSession;
  locale: string;
  lang: Lang;
}) {
  const meta = getLessonMeta(session.contentId);
  const title = meta?.title[lang] ?? meta?.title.en ?? session.contentId;
  const color = trackColor(session.contentId);
  const date = new Date(session.completedAt);
  const dateLabel = date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });

  return (
    <Box className="bg-[#121826] border border-[#1A2233] rounded-[18px] p-4 mb-3">
      <HStack className="items-center justify-between">
        <VStack space="xs" className="flex-1 mr-3">
          <HStack className="items-center" space="xs">
            <Box style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text className="text-[#E6EAF2] text-[14px] font-semibold flex-1">
              {title}
            </Text>
          </HStack>
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

// ---------------------------------------------------------------------------
// Saved tab components
// ---------------------------------------------------------------------------

function SavedCard({
  contentId,
  lang,
  startLabel,
}: {
  contentId: string;
  lang: Lang;
  startLabel: string;
}) {
  const meta = getLessonMeta(contentId);
  const title = meta?.title[lang] ?? meta?.title.en ?? contentId;
  const color = trackColor(contentId);

  return (
    <Box className="bg-[#121826] border border-[#1A2233] rounded-[18px] p-4 mb-3">
      <HStack className="items-center justify-between">
        <HStack className="items-center flex-1 mr-3" space="xs">
          <Box style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text className="text-[#E6EAF2] text-[14px] font-semibold flex-1">
            {title}
          </Text>
        </HStack>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(session)/intro",
              params: {
                contentId,
                version: String(meta?.version ?? 1),
                lang,
                title,
                difficulty: String(meta?.difficulty ?? 1),
                estimatedMinutes: String(meta?.estimatedMinutes ?? 0),
              },
            })
          }
          style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color, fontSize: 13, fontWeight: "600" }}>
            {startLabel}
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Library screen
// ---------------------------------------------------------------------------

type Tab = "history" | "saved";

export default function Library() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { getUserData } = useUser();
  const locale = DATE_LOCALE[i18n.language] ?? "en-US";
  const lang = (i18n.language ?? "pt") as Lang;

  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    Promise.all([
      getRecentSessions(uid).catch(() => [] as CompletedSession[]),
      getUserData({ userId: uid }).catch(() => null),
    ]).then(([s, user]) => {
      setSessions(s);
      setSavedIds(user?.savedContentIds ?? []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  function TabButton({ id, label }: { id: Tab; label: string }) {
    const active = activeTab === id;
    return (
      <Pressable
        onPress={() => setActiveTab(id)}
        className={[
          "flex-1 h-[36px] rounded-xl items-center justify-center",
          active ? "bg-[#1A2233]" : "bg-transparent",
        ].join(" ")}
      >
        <Text
          className={[
            "text-[14px] font-semibold",
            active ? "text-[#E6EAF2]" : "text-[#7B8193]",
          ].join(" ")}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-[#E6EAF2] text-[22px] font-bold">
          {t("tabs.library.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {t("tabs.library.subtitle")}
        </Text>

        {/* Tab selector */}
        <HStack
          className="mt-4 bg-[#0E141E] border border-[#1A2233] rounded-2xl p-1"
          space="xs"
        >
          <TabButton id="history" label={t("tabs.library.tab_history")} />
          <TabButton id="saved" label={t("tabs.library.tab_saved")} />
        </HStack>
      </Box>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {loading ? (
          <Text className="text-[#AAB0C0] text-center mt-10">
            {t("common.loading")}
          </Text>
        ) : activeTab === "history" ? (
          sessions.length === 0 ? (
            <VStack className="items-center mt-10" space="sm">
              <Text className="text-[#E6EAF2] text-[16px] font-semibold">
                {t("tabs.library.empty_title")}
              </Text>
              <Text className="text-[#7B8193] text-[13px] text-center">
                {t("tabs.library.empty_subtitle")}
              </Text>
            </VStack>
          ) : (
            sessions.map((s) => (
              <SessionRow key={`${s.date}_${s.contentId}`} session={s} locale={locale} lang={lang} />
            ))
          )
        ) : savedIds.length === 0 ? (
          <VStack className="items-center mt-10" space="sm">
            <Text className="text-[#E6EAF2] text-[16px] font-semibold">
              {t("tabs.library.saved_empty_title")}
            </Text>
            <Text className="text-[#7B8193] text-[13px] text-center">
              {t("tabs.library.saved_empty_subtitle")}
            </Text>
          </VStack>
        ) : (
          savedIds.map((id) => (
            <SavedCard
              key={id}
              contentId={id}
              lang={lang}
              startLabel={t("tabs.library.start")}
            />
          ))
        )}
      </ScrollView>
    </Box>
  );
}
