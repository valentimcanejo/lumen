import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View as RNView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { useTranslation } from "react-i18next";
import { Lang } from "../../models/lang";
import { getGoals, type Goal } from "../../repositories/goals.repo";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  book:      "book-outline",
  brain:     "bulb-outline",
  globe:     "globe-outline",
  chart:     "bar-chart-outline",
  hourglass: "hourglass-outline",
  person:    "person-outline",
};

export default function Goals() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const canContinue = selected.length >= 1;
  const { t } = useTranslation();
  const { selectedLanguage, userId } = useLocalSearchParams();

  useEffect(() => {
    getGoals()
      .then(setGoals)
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const handleNext = () =>
    router.push({
      pathname: `/(onboarding)/social-proof`,
      params: { selectedLanguage, selectedTracks: selected.join(","), userId },
    });

  if (loading) {
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center">
        <ActivityIndicator color="#F5C77A" />
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
        ListHeaderComponent={
          <Box className="mb-5">
            <Text className="text-[#E6EAF2] text-[26px] font-semibold">
              {t("onboarding.goals.title")}
            </Text>
            <Text className="text-[#AAB0C0] mt-2">
              {t("onboarding.goals.subtitle")}
            </Text>
          </Box>
        }
        ItemSeparatorComponent={() => <Box style={{ height: 10 }} />}
        renderItem={({ item: g }) => {
          const active = selected.includes(g.id);
          const color = g.color ?? "#AAB0C0";
          const iconName = ICON_MAP[g.icon] ?? "ellipse-outline";

          return (
            <Pressable onPress={() => toggle(g.id)}>
              <RNView style={[
                go.card,
                {
                  borderColor: active ? color : "#1E2A3E",
                  borderLeftColor: active ? color : "#1E2A3E",
                  backgroundColor: active ? color + "10" : "#111827",
                },
              ]}>
                <RNView style={[go.iconBadge, { backgroundColor: color + "20" }]}>
                  <Ionicons name={iconName} size={20} color={color} />
                </RNView>

                <RNView style={go.textCol}>
                  <Text style={go.goalTitle}>{g.title[selectedLanguage as Lang]}</Text>
                  {g.description?.[selectedLanguage as Lang] && (
                    <Text style={go.goalDesc} numberOfLines={2}>
                      {g.description[selectedLanguage as Lang]}
                    </Text>
                  )}
                </RNView>

                <RNView style={[
                  go.check,
                  {
                    borderColor: active ? color : "#2A2F3E",
                    backgroundColor: active ? color : "transparent",
                  },
                ]}>
                  {active && <Ionicons name="checkmark" size={13} color="#0B0F14" />}
                </RNView>
              </RNView>
            </Pressable>
          );
        }}
      />

      <Box
        className="px-6"
        style={{ paddingBottom: Math.max(insets.bottom + 12, 24), paddingTop: 12 }}
      >
        <LumenButton disabled={!canContinue} onPress={handleNext}>
          {t("onboarding.goals.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}

const go = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  goalTitle: {
    color: "#E6EAF2",
    fontSize: 15,
    fontWeight: "700",
  },
  goalDesc: {
    color: "#7B8193",
    fontSize: 12,
    lineHeight: 17,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
