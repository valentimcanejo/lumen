import React, { useState } from "react";
import { ScrollView, StyleSheet, View as RNView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";
import { router } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { useTranslation } from "react-i18next";
import { Lang } from "../../models/lang";
import { getGoals, type Goal } from "../../repositories/goals.repo";
import { useAuth } from "../../hooks/useAuth";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  book:      "book-outline",
  brain:     "bulb-outline",
  globe:     "globe-outline",
  chart:     "bar-chart-outline",
  hourglass: "hourglass-outline",
  person:    "person-outline",
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function Goals() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [goals] = useState<Goal[]>(() => getGoals());
  const [selected, setSelected] = useState<string[]>([]);
  const canContinue = selected.length >= 1;
  const { t, i18n } = useTranslation();
  const { uid: userId } = useAuth();
  const selectedLanguage = (["pt","en","es"].includes(i18n.language) ? i18n.language : "pt") as Lang;

  const COLS = 2;
  const GAP = 12;
  const H_PAD = 24;
  const tileSize = (width - H_PAD * 2 - GAP) / COLS;

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

  // pair goals into rows of 2
  const rows: Goal[][] = [];
  for (let i = 0; i < goals.length; i += COLS) {
    rows.push(goals.slice(i, i + COLS));
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: insets.top + 24,
          paddingBottom: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-[#E6EAF2] text-[26px] font-semibold">
          {t("onboarding.goals.title")}
        </Text>
        <Text className="text-[#AAB0C0] mt-2 mb-6">
          {t("onboarding.goals.subtitle")}
        </Text>

        {rows.map((row, ri) => (
          <RNView key={ri} style={go.row}>
            {row.map((g) => {
              const active = selected.includes(g.id);
              const color = g.color ?? "#AAB0C0";
              const iconName = ICON_MAP[g.icon] ?? "ellipse-outline";

              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggle(g.id)}
                  style={{ width: tileSize, marginBottom: GAP }}
                >
                  <RNView
                    style={[
                      go.tile,
                      {
                        height: tileSize * 0.95,
                        borderColor: active ? color : "#1E2A3E",
                        backgroundColor: active ? color + "12" : "#111827",
                      },
                    ]}
                  >
                    {/* Checkmark badge */}
                    {active && (
                      <RNView style={[go.checkBadge, { backgroundColor: color }]}>
                        <Ionicons name="checkmark" size={11} color="#0B0F14" />
                      </RNView>
                    )}

                    {/* Icon */}
                    <RNView style={[go.iconWrap, { backgroundColor: color + "20" }]}>
                      <Ionicons name={iconName} size={26} color={color} />
                    </RNView>

                    {/* Title */}
                    <Text style={[go.tileTitle, { color: active ? "#E6EAF2" : "#AAB0C0" }]} numberOfLines={2}>
                      {g.title[selectedLanguage as Lang]}
                    </Text>
                  </RNView>
                </Pressable>
              );
            })}
            {/* Fill empty slot if odd number */}
            {row.length < COLS && <RNView style={{ width: tileSize }} />}
          </RNView>
        ))}
      </ScrollView>

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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    justifyContent: "flex-end",
    gap: 10,
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
});
