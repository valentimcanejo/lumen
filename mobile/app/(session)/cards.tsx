import React, { useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { useAuth } from "../../hooks/useAuth";
import { usePack } from "../../hooks/usePack";
import { SessionError } from "./_components/SessionError";
import { gradeCard } from "../../repositories/progress.repo";
import type { Lang } from "../../models/lang";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

type Grade = "know" | "dont";

export default function CardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentId, version, lang } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
  };
  const { uid } = useAuth();

  const { pack, loading, error } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  const cards = pack?.cards ?? [];
  const total = cards.length;

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const flipScale = useSharedValue(1);

  const current = cards[index];

  const progressValue = useMemo(() => {
    if (!total) return 0.35;
    const stepStart = 0.25;
    const stepEnd = 0.5;
    const pct = index / Math.max(1, total);
    return stepStart + (stepEnd - stepStart) * pct;
  }, [index, total]);

  function revealCard() {
    flipScale.value = withTiming(0, { duration: 180 }, (done) => {
      if (done) runOnJS(setShowBack)(true);
    });
  }

  useEffect(() => {
    if (showBack) {
      setRevealed(true);
      flipScale.value = withTiming(1, { duration: 180 });
    }
  }, [showBack]);

  function goNext() {
    setRevealed(false);
    setShowBack(false);
    flipScale.value = 1;
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= total) {
        router.push({
          pathname: "/(session)/quiz",
          params: { contentId, version, lang },
        });
        return prev;
      }
      return next;
    });
  }

  function onGrade(g: Grade) {
    if (uid && current) {
      gradeCard(uid, contentId, current.id, g).catch(() => {});
    }
    goNext();
  }

  if (error) return <SessionError message={error} />;

  if (loading) {
    return (
      <Box className="flex-1 bg-[#0B0F14] items-center justify-center">
        <Text className="text-[#AAB0C0]">{t("common.loading")}</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={progressValue} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            {t("session.cards.step")}
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">
          {t("session.cards.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {pack?.lesson?.title ?? t("common.content")} •{" "}
          {total ? `${index + 1} / ${total}` : ""}
        </Text>

        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      {!pack || total === 0 ? (
        <Box className="px-5 pt-5">
          <VStack space="md">
            <Text className="text-[#AAB0C0]">{t("session.cards.empty")}</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/quiz",
                  params: { contentId, version, lang },
                })
              }
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {t("session.cards.go_to_quiz")}
              </Text>
            </Pressable>
          </VStack>
        </Box>
      ) : (
        <>
          {/* Scrollable card content */}
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scaleX: flipScale.value }] }))}>
              <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
                <VStack space="sm">
                  <Text className="text-[#AAB0C0] text-[12px]">
                    {showBack ? t("session.cards.answer") : t("session.cards.question")}
                  </Text>
                  <Text
                    className="text-[#E6EAF2] font-semibold leading-[26px]"
                    style={{ fontSize: showBack ? 16 : 18 }}
                  >
                    {showBack ? current.back : current.front}
                  </Text>
                </VStack>
              </Box>
            </Animated.View>
          </ScrollView>

          {/* Fixed bottom buttons — always visible */}
          <Box
            className="px-5 pt-3 border-t border-[#1A2233]"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {!revealed ? (
              <Pressable
                onPress={revealCard}
                className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
              >
                <Text className="text-[#0B0F14] text-[16px] font-semibold">
                  {t("session.cards.reveal")}
                </Text>
              </Pressable>
            ) : (
              <HStack space="sm">
                <Pressable
                  onPress={() => onGrade("know")}
                  className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                  style={{ backgroundColor: "#5ED19A" }}
                >
                  <Text className="text-[#0B0F14] text-[16px] font-semibold">
                    {t("session.cards.correct")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onGrade("dont")}
                  className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                  style={{ backgroundColor: "#E26D6D" }}
                >
                  <Text className="text-[#0B0F14] text-[16px] font-semibold">
                    {t("session.cards.wrong")}
                  </Text>
                </Pressable>
              </HStack>
            )}

            <Pressable
              onPress={goNext}
              className="h-[52px] rounded-2xl mt-3 border border-[#1A2233] items-center justify-center"
            >
              <Text className="text-[#AAB0C0] text-[16px] font-semibold">
                {t("session.cards.skip")}
              </Text>
            </Pressable>
          </Box>
        </>
      )}
    </Box>
  );
}
