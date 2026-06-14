import React, { useState } from "react";
import { ScrollView, StyleSheet, View as RNView, useWindowDimensions, Text as RNText } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
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
import { FEATURES, TEST_TRACKS } from "../../constants/config";

const COLS = 3;
const GAP = 10;
const H_PAD = 24;

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------
type TileProps = {
  g: Goal;
  active: boolean;
  onToggle: (id: string) => void;
  tileSize: number;
  lang: Lang;
};

function GoalTile({ g, active, onToggle, tileSize, lang }: TileProps) {
  const color = g.color ?? "#AAB0C0";
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.93, { damping: 15, stiffness: 400 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );
    onToggle(g.id);
  }

  return (
    <Animated.View style={[animStyle, { width: tileSize, marginBottom: GAP }]}>
      <Pressable onPress={handlePress}>
        <RNView
          style={[
            go.tile,
            {
              height: tileSize * 1.05,
              borderColor: active ? color : "#1E2A3E",
              backgroundColor: active ? color + "18" : "#111827",
            },
          ]}
        >
          {active && (
            <RNView style={[go.checkBadge, { backgroundColor: color }]}>
              <Ionicons name="checkmark" size={10} color="#0B0F14" />
            </RNView>
          )}

          <RNText style={go.emoji}>{g.emoji}</RNText>

          <Text
            style={[go.tileTitle, { color: active ? "#E6EAF2" : "#C8CDD8" }]}
            numberOfLines={2}
          >
            {g.title[lang]}
          </Text>
        </RNView>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function Goals() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [goals] = useState<Goal[]>(() => {
    const all = getGoals();
    return FEATURES.TEST_MODE ? all.filter((g) => TEST_TRACKS.includes(g.id)) : all;
  });
  const [selected, setSelected] = useState<string[]>([]);
  const canContinue = selected.length >= 1;
  const { t, i18n } = useTranslation();
  const { uid: userId } = useAuth();
  const selectedLanguage = (["pt","en","es"].includes(i18n.language) ? i18n.language : "pt") as Lang;

  const tileSize = (width - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const handleNext = () =>
    router.push({
      pathname: `/(onboarding)/daily-time`,
      params: { selectedLanguage, selectedTracks: selected.join(","), userId },
    });

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
        <Text className="text-[#E6EAF2] text-[26px] font-semibold">
          {t("onboarding.goals.title")}
        </Text>
        <Text className="text-[#AAB0C0] mt-1.5">
          {t("onboarding.goals.subtitle")}
        </Text>

        <RNView style={{ height: 20 }} />

        {rows.map((row, ri) => (
          <RNView key={ri} style={go.row}>
            {row.map((g) => (
              <GoalTile
                key={g.id}
                g={g}
                active={selected.includes(g.id)}
                onToggle={toggle}
                tileSize={tileSize}
                lang={selectedLanguage}
              />
            ))}
            {row.length < COLS &&
              Array.from({ length: COLS - row.length }).map((_, i) => (
                <RNView key={i} style={{ width: tileSize }} />
              ))
            }
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
    gap: GAP,
  },
  tile: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 32,
    lineHeight: 38,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
});
