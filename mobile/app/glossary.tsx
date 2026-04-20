import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useAuth } from "../hooks/useAuth";
import { getGlossary, type GlossaryEntry } from "../repositories/glossary.repo";
import { trackColor } from "../constants/tracks";

export default function GlossaryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    getGlossary(uid)
      .then((data) => setEntries(data.sort((a, b) => a.term.localeCompare(b.term))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
        </TouchableOpacity>
        <Text style={s.title}>{t("glossary.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color="#7B8193" />
        <TextInput
          style={s.searchInput}
          placeholder={t("glossary.search_placeholder")}
          placeholderTextColor="#4A5568"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={16} color="#7B8193" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <Text style={s.emptyText}>{t("common.loading")}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>
            {entries.length === 0
              ? t("glossary.empty")
              : t("glossary.no_results")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => `${item.contentId}-${i}`}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const color = trackColor(item.trackId);
            const key = `${item.contentId}-${item.term}`;
            const isOpen = expanded === key;
            return (
              <TouchableOpacity
                style={[s.card, { borderLeftColor: color + "80" }]}
                onPress={() => setExpanded(isOpen ? null : key)}
                activeOpacity={0.8}
              >
                <View style={s.cardHeader}>
                  <Text style={s.term} numberOfLines={isOpen ? undefined : 1}>
                    {item.term}
                  </Text>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#7B8193"
                  />
                </View>
                {isOpen && (
                  <>
                    <Text style={s.definition}>{item.definition}</Text>
                    <Text style={s.source}>{item.lessonTitle}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F14" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  title: { color: "#E6EAF2", fontSize: 17, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#E6EAF2",
    fontSize: 14,
    padding: 0,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#7B8193", fontSize: 14, textAlign: "center", paddingHorizontal: 32, lineHeight: 22 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#111827",
    borderRadius: 14,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  term: { color: "#E6EAF2", fontSize: 14, fontWeight: "600", flex: 1 },
  definition: { color: "#AAB0C0", fontSize: 13, lineHeight: 19, marginTop: 8 },
  source: { color: "#4A5568", fontSize: 11, marginTop: 6 },
});
