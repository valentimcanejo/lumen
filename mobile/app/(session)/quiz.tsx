import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import type { PackQuizQuestion } from "../../models/pack";
import { usePack } from "../../hooks/usePack";
import { SessionError } from "./_components/SessionError";
import type { Lang } from "../../models/lang";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

type OptionState = "idle" | "correct" | "wrong";

function OptionRow({
  label,
  selected,
  disabled,
  state,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  state: OptionState;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const prevState = useRef<OptionState>("idle");

  useEffect(() => {
    if (prevState.current === state) return;
    prevState.current = state;

    if (state === "correct") {
      scale.value = withSequence(
        withSpring(1.04, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    } else if (state === "wrong") {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50, easing: Easing.linear }),
        withTiming(8, { duration: 50, easing: Easing.linear }),
        withTiming(-6, { duration: 50, easing: Easing.linear }),
        withTiming(6, { duration: 50, easing: Easing.linear }),
        withTiming(-3, { duration: 50, easing: Easing.linear }),
        withTiming(0, { duration: 50, easing: Easing.linear }),
      );
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  const bg =
    state === "correct" ? "#0F2019" :
    state === "wrong"   ? "#1E0D10" :
    selected            ? "#141D2E" : "#0E131C";

  const border =
    state === "correct" ? "#5ED19A" :
    state === "wrong"   ? "#E26D6D" :
    selected            ? "#F5C77A" : "#1A2233";

  const textColor =
    state === "correct" ? "#DFF7EC" :
    state === "wrong"   ? "#F7E0E0" : "#E6EAF2";

  const dotColor =
    state === "correct" ? "#5ED19A" :
    state === "wrong"   ? "#E26D6D" :
    selected            ? "#F5C77A" : "#2A3448";

  return (
    <Animated.View style={[s.optionWrap, { backgroundColor: bg, borderColor: border }, animStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={s.optionInner}
      >
        <HStack className="items-center flex-1" space="md">
          <Box style={[s.dot, { backgroundColor: dotColor }]} />
          <Text style={[s.optionText, { color: textColor, flex: 1 }]}>
            {label}
          </Text>
        </HStack>
        <Box className="ml-3">
          {state === "correct" ? (
            <Ionicons name="checkmark-circle" size={20} color="#5ED19A" />
          ) : state === "wrong" ? (
            <Ionicons name="close-circle" size={20} color="#E26D6D" />
          ) : selected ? (
            <Ionicons name="radio-button-on" size={20} color="#F5C77A" />
          ) : (
            <Ionicons name="radio-button-off" size={20} color="#3A4562" />
          )}
        </Box>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  optionWrap: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 14, lineHeight: 20 },
});

function getOptionState(args: {
  answered: boolean;
  optionIndex: number;
  selectedIndex: number | null;
  correctIndex: number;
}): OptionState {
  const { answered, optionIndex, selectedIndex, correctIndex } = args;
  if (!answered) return "idle";
  if (optionIndex === correctIndex) return "correct";
  if (selectedIndex === optionIndex && selectedIndex !== correctIndex) return "wrong";
  return "idle";
}

export default function QuizScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentId, version, lang } = useLocalSearchParams() as {
    contentId: string;
    version: string;
    lang: Lang;
  };

  const { pack, loading, error } = usePack({
    contentId,
    version: Number(version),
    lang: lang ?? "pt",
  });

  const quiz = pack?.quiz ?? [];
  const total = quiz.length;

  const [qIndex, setQIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentH = useRef(0);
  const scrollViewH = useRef(0);
  const currentScrollY = useRef(0);
  const arrowOpacity = useSharedValue(0);
  const arrowAnimStyle = useAnimatedStyle(() => ({ opacity: arrowOpacity.value }));

  function updateScrollHint(y: number) {
    currentScrollY.current = y;
    const maxScroll = scrollContentH.current - scrollViewH.current;
    const canScroll = maxScroll > 10;
    const nearBottom = y >= maxScroll - 40;
    arrowOpacity.value = withTiming(canScroll && !nearBottom ? 1 : 0, { duration: 200 });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    currentScrollY.current = 0;
    arrowOpacity.value = 0;
    scrollContentH.current = 0;
  }, [qIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const current: PackQuizQuestion | undefined = quiz[qIndex];

  const shuffled = useMemo(() => {
    if (!current) return null;
    const indices = current.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      options: indices.map((i) => current.options[i]),
      answerIndex: indices.indexOf(current.answerIndex),
    };
  }, [qIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressValue = useMemo(() => {
    if (!total) return 0.62;
    const stepStart = 0.5;
    const stepEnd = 0.75;
    const pct = qIndex / Math.max(1, total);
    return stepStart + (stepEnd - stepStart) * pct;
  }, [qIndex, total]);

  function onSelect(optionIdx: number) {
    if (!current || answered) return;
    setSelectedIndex(optionIdx);
    setAnswered(true);
    if (optionIdx === shuffled?.answerIndex) {
      setCorrectCount((v) => v + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function onNext() {
    if (!current) return;
    const next = qIndex + 1;
    if (next >= total) {
      router.replace({
        pathname: "/(session)/summary",
        params: {
          contentId,
          version,
          lang,
          correct: String(correctCount),
          total: String(total),
        },
      });
      return;
    }
    setQIndex(next);
    setSelectedIndex(null);
    setAnswered(false);
  }

  if (error) return <SessionError message={error} />;

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={progressValue} />

          <Text className="text-[#AAB0C0] text-[12px] w-[54px] text-right">
            {t("session.quiz.step")}
          </Text>
        </HStack>
      </Box>

      <Box className="px-5 pt-6">
        <Text className="text-[#E6EAF2] text-[22px] font-semibold">
          {t("session.quiz.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mt-1">
          {pack?.lesson?.title ?? t("common.content")} •{" "}
          {total ? `${qIndex + 1}/${total}` : ""}
        </Text>

        <Box className="h-[1px] bg-[#1A2233] mt-4" />
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <Text className="text-[#AAB0C0]">{t("common.loading")}</Text>
        </Box>
      ) : !pack || total === 0 || !current ? (
        <Box className="px-5 pt-5">
          <VStack space="md">
            <Text className="text-[#AAB0C0]">{t("session.quiz.empty")}</Text>
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/(session)/summary",
                  params: { contentId, version, lang },
                })
              }
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {t("session.quiz.go_to_summary")}
              </Text>
            </Pressable>
          </VStack>
        </Box>
      ) : (
        <>
          {/* Scrollable: question + options + explanation */}
          <Box style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => updateScrollHint(e.nativeEvent.contentOffset.y)}
            onContentSizeChange={(_, h) => { scrollContentH.current = h; updateScrollHint(currentScrollY.current); }}
            onLayout={(e) => { scrollViewH.current = e.nativeEvent.layout.height; updateScrollHint(currentScrollY.current); }}
          >
            <Box className="bg-[#121826] border border-[#1A2233] rounded-[22px] p-5">
              <Text className="text-[#AAB0C0] text-[12px]">
                {t("session.quiz.question")}
              </Text>
              <Text className="text-[#E6EAF2] text-[18px] font-semibold leading-[26px] mt-2">
                {current.question}
              </Text>
              <HStack className="items-center justify-between mt-4">
                <Text className="text-[#7B8193] text-[12px]">
                  {t("session.quiz.select")}
                </Text>
                <Text className="text-[#7B8193] text-[12px]">
                  {correctCount} {t("session.quiz.correct_count")}
                </Text>
              </HStack>
            </Box>

            <VStack space="sm" className="mt-4">
              {(shuffled?.options ?? current.options).map((opt, idx) => {
                const state = getOptionState({
                  answered,
                  optionIndex: idx,
                  selectedIndex,
                  correctIndex: shuffled?.answerIndex ?? current.answerIndex,
                });
                return (
                  <OptionRow
                    key={`${qIndex}-${idx}`}
                    label={opt}
                    selected={selectedIndex === idx}
                    disabled={answered}
                    state={state}
                    onPress={() => onSelect(idx)}
                  />
                );
              })}
            </VStack>

            {answered ? (
              <Box className="mt-4 bg-[#0E141E] border border-[#1A2233] rounded-[18px] p-4">
                <Text className="text-[#AAB0C0] text-[12px]">
                  {t("session.quiz.explanation")}
                </Text>
                <Text className="text-[#E6EAF2] text-[14px] leading-[22px] mt-2">
                  {current.explanation}
                </Text>
              </Box>
            ) : null}
          </ScrollView>

          <Animated.View
            pointerEvents="none"
            style={[{
              position: "absolute",
              bottom: 10,
              alignSelf: "center",
              backgroundColor: "#1A2233",
              borderRadius: 20,
              padding: 7,
            }, arrowAnimStyle]}
          >
            <Ionicons name="chevron-down" size={16} color="#AAB0C0" />
          </Animated.View>
          </Box>

          {/* Fixed bottom buttons — always visible */}
          <Box
            className="px-5 pt-3 border-t border-[#1A2233]"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            <Pressable
              onPress={onNext}
              disabled={!answered}
              className={[
                "h-[52px] rounded-2xl items-center justify-center",
                answered ? "bg-[#F5C77A]" : "bg-[#1A2233]",
              ].join(" ")}
            >
              <Text
                className={[
                  "text-[16px] font-semibold",
                  answered ? "text-[#0B0F14]" : "text-[#7B8193]",
                ].join(" ")}
              >
                {qIndex + 1 >= total ? t("session.quiz.finish") : t("common.next")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/summary",
                  params: {
                    contentId,
                    version,
                    lang,
                    correct: String(correctCount),
                    total: String(total),
                  },
                })
              }
              className="h-[52px] rounded-2xl mt-3 border border-[#1A2233] items-center justify-center"
            >
              <Text className="text-[#AAB0C0] text-[16px] font-semibold">
                {t("session.quiz.skip")}
              </Text>
            </Pressable>
          </Box>
        </>
      )}
    </Box>
  );
}
