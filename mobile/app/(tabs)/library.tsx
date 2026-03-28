import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DocumentSnapshot } from "firebase/firestore";

import { Box } from "../../components/ui/box";
import { HStack } from "../../components/ui/hstack";
import { VStack } from "../../components/ui/vstack";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";

import { useAuth } from "../../hooks/useAuth";
import {
  getSessionsPage,
  type CompletedSession,
} from "../../repositories/progress.repo";
import { getSavedContentIds } from "../../repositories/user.repo";
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

import { Ionicons } from "@expo/vector-icons";

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "#5ED19A" : pct >= 60 ? "#F5C77A" : "#E26D6D";
  return (
    <RNView style={[lb.scoreBadge, { borderColor: color + "55", backgroundColor: color + "18" }]}>
      <Text style={[lb.scoreText, { color }]}>{pct}%</Text>
    </RNView>
  );
}

function SessionRow({ session, locale, lang }: { session: CompletedSession; locale: string; lang: Lang }) {
  const meta = getLessonMeta(session.contentId);
  const title = meta?.title[lang] ?? meta?.title.en ?? session.contentId;
  const color = trackColor(session.contentId);
  const date = new Date(session.completedAt);
  const dateLabel = date.toLocaleDateString(locale, { day: "2-digit", month: "short" });

  return (
    <RNView style={[lb.card, { borderLeftColor: color + "70" }]}>
      <RNView style={[lb.iconBadge, { backgroundColor: color + "18", borderColor: color + "35" }]}>
        <Ionicons name="checkmark" size={15} color={color} />
      </RNView>
      <RNView style={lb.cardContent}>
        <Text style={lb.cardTitle} numberOfLines={1}>{title}</Text>
        <RNView style={lb.cardMeta}>
          <Text style={lb.metaText}>{dateLabel}</Text>
          <RNView style={lb.metaDot} />
          <Text style={lb.metaText}>{session.minutes} min</Text>
        </RNView>
      </RNView>
      <ScoreBadge score={session.quizScore} />
    </RNView>
  );
}

// ---------------------------------------------------------------------------
// Saved tab components
// ---------------------------------------------------------------------------

function SavedCard({ contentId, lang, startLabel }: { contentId: string; lang: Lang; startLabel: string }) {
  const meta = getLessonMeta(contentId);
  const title = meta?.title[lang] ?? meta?.title.en ?? contentId;
  const color = trackColor(contentId);

  return (
    <RNView style={[lb.card, { borderLeftColor: color + "70" }]}>
      <RNView style={[lb.iconBadge, { backgroundColor: color + "18", borderColor: color + "35" }]}>
        <Ionicons name="bookmark" size={14} color={color} />
      </RNView>
      <Text style={[lb.cardTitle, { flex: 1 }]} numberOfLines={2}>{title}</Text>
      <TouchableOpacity
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
        activeOpacity={0.8}
        style={[lb.startBtn, { backgroundColor: color + "22", borderColor: color + "40" }]}
      >
        <Text style={[lb.startBtnText, { color }]}>{startLabel}</Text>
      </TouchableOpacity>
    </RNView>
  );
}

const lb = StyleSheet.create({
  card: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: "#1E2A3E",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: "#E6EAF2",
    fontSize: 14,
    fontWeight: "700",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#4A5568",
    fontSize: 12,
    fontWeight: "500",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2A3448",
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "700",
  },
  startBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 0,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

// ---------------------------------------------------------------------------
// Library screen
// ---------------------------------------------------------------------------

type Tab = "history" | "saved";

const PAGE_SIZE = 10;

export default function Library() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const locale = DATE_LOCALE[i18n.language] ?? "en-US";
  const lang = (i18n.language ?? "pt") as Lang;

  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    Promise.all([
      getSessionsPage(uid, PAGE_SIZE).catch(() => ({
        sessions: [] as CompletedSession[],
        lastDoc: null,
        hasMore: false,
      })),
      getSavedContentIds(uid).catch(() => [] as string[]),
    ]).then(([page, saved]) => {
      setSessions(page.sessions);
      setLastDoc(page.lastDoc);
      setHasMore(page.hasMore);
      setSavedIds(saved);
      setLoading(false);
    });
  }, [uid]);

  async function loadMore() {
    if (!uid || !lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getSessionsPage(uid, PAGE_SIZE, lastDoc);
      setSessions((prev) => [...prev, ...page.sessions]);
      setLastDoc(page.lastDoc);
      setHasMore(page.hasMore);
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
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
        <RNView style={tb.tabRow}>
          {(["history", "saved"] as Tab[]).map((id) => {
            const active = activeTab === id;
            const label = id === "history" ? t("tabs.library.tab_history") : t("tabs.library.tab_saved");
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setActiveTab(id)}
                activeOpacity={0.8}
                style={[tb.tab, active && tb.tabActive]}
              >
                <Text style={[tb.tabText, active && tb.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </RNView>
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
            <>
              {sessions.map((s) => (
                <SessionRow key={`${s.date}_${s.contentId}`} session={s} locale={locale} lang={lang} />
              ))}
              {hasMore && (
                <Pressable
                  onPress={loadMore}
                  disabled={loadingMore}
                  className="h-[44px] rounded-2xl border border-[#1A2233] items-center justify-center mt-1"
                  style={{ opacity: loadingMore ? 0.5 : 1 }}
                >
                  <Text className="text-[#7B8FE0] text-[14px] font-semibold">
                    {loadingMore
                      ? t("tabs.library.loading_more")
                      : t("tabs.library.load_more")}
                  </Text>
                </Pressable>
              )}
            </>
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

const tb = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#0E141E",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 16,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#1A2233",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A5568",
  },
  tabTextActive: {
    color: "#E6EAF2",
  },
});
