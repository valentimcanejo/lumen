import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, View as RNView } from "react-native";
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
import { getLessonMeta } from "../../repositories/lessons.repo";
import { trackColor } from "../../constants/tracks";
import type { Lang } from "../../models/lang";

function TopProgress({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%`, backgroundColor: color }} className="h-full" />
    </Box>
  );
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

type OptionState = "idle" | "correct" | "wrong";

function OptionRow({
  label,
  index,
  selected,
  disabled,
  state,
  color,
  onPress,
}: {
  label: string;
  index: number;
  selected: boolean;
  disabled: boolean;
  state: OptionState;
  color: string;
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
        withSpring(1.03, { damping: 4, stiffness: 300 }),
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
    selected            ? color : "#1E2A3E";

  const textColor =
    state === "correct" ? "#DFF7EC" :
    state === "wrong"   ? "#F7E0E0" : "#E6EAF2";

  const badgeBg =
    state === "correct" ? "#5ED19A22" :
    state === "wrong"   ? "#E26D6D22" :
    selected            ? color + "22" : "#1A2233";

  const badgeColor =
    state === "correct" ? "#5ED19A" :
    state === "wrong"   ? "#E26D6D" :
    selected            ? color : "#4A5568";

  return (
    <Animated.View style={[s.optionWrap, { backgroundColor: bg, borderColor: border }, animStyle]}>
      <Pressable onPress={onPress} disabled={disabled} style={s.optionInner}>
        {/* Letter badge */}
        <RNView style={[s.letterBadge, { backgroundColor: badgeBg }]}>
          <Text style={[s.letterText, { color: badgeColor }]}>
            {OPTION_LETTERS[index] ?? String(index + 1)}
          </Text>
        </RNView>

        <Text style={[s.optionText, { color: textColor }]}>
          {label}
        </Text>

        {/* State icon */}
        <RNView style={s.stateIcon}>
          {state === "correct" ? (
            <Ionicons name="checkmark-circle" size={20} color="#5ED19A" />
          ) : state === "wrong" ? (
            <Ionicons name="close-circle" size={20} color="#E26D6D" />
          ) : selected ? (
            <Ionicons name="ellipse" size={10} color={color} />
          ) : null}
        </RNView>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  optionWrap: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 2,
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 12,
  },
  letterBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  letterText: {
    fontSize: 13,
    fontWeight: "800",
  },
  optionText: { fontSize: 14, lineHeight: 20, flex: 1 },
  stateIcon: { width: 20, alignItems: "center", flexShrink: 0 },
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

  const lessonMeta = getLessonMeta(contentId);
  const color = trackColor(lessonMeta?.trackId ?? contentId);

  const quiz = pack?.quiz ?? [];
  const total = quiz.length;

  const [qIndex, setQIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const correctCountRef = useRef(0);

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
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressValue = useMemo(() => {
    if (!total) return 0.62;
    const stepStart = 0.25;
    const stepEnd = 0.75;
    const pct = qIndex / Math.max(1, total);
    return stepStart + (stepEnd - stepStart) * pct;
  }, [qIndex, total]);

  function onSelect(optionIdx: number) {
    if (!current || answered) return;
    setSelectedIndex(optionIdx);
    setAnswered(true);
    if (optionIdx === shuffled?.answerIndex) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
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
          correct: String(correctCountRef.current),
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
          <Pressable onPress={() => setShowExitModal(true)}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>

          <TopProgress value={progressValue} color={color} />

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
            {/* Question card */}
            <RNView style={q.questionCard}>
              {/* Question number pill */}
              <RNView style={q.qNumRow}>
                <RNView style={[q.qNumPill, { backgroundColor: color + "15", borderColor: color + "30" }]}>
                  <Text style={[q.qNumText, { color }]}>
                    {qIndex + 1}/{total}
                  </Text>
                </RNView>
                <Text style={q.correctBadge}>
                  {correctCount} {t("session.quiz.correct_count")}
                </Text>
              </RNView>

              <Text style={q.questionText}>{current.question}</Text>

              <Text style={q.selectHint}>{t("session.quiz.select")}</Text>
            </RNView>

            {/* Options */}
            <RNView style={{ gap: 8, marginTop: 16 }}>
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
                    index={idx}
                    selected={selectedIndex === idx}
                    disabled={answered}
                    state={state}
                    color={color}
                    onPress={() => onSelect(idx)}
                  />
                );
              })}
            </RNView>

            {/* Explanation */}
            {answered && (() => {
              const isCorrect = selectedIndex === (shuffled?.answerIndex ?? current.answerIndex);
              return (
                <RNView style={[
                  q.explanationBox,
                  isCorrect ? q.explanationCorrect : q.explanationWrong,
                ]}>
                  <RNView style={q.explanationHeader}>
                    <Ionicons
                      name={isCorrect ? "checkmark-circle" : "information-circle"}
                      size={16}
                      color={isCorrect ? "#5ED19A" : "#F5C77A"}
                    />
                    <Text style={[q.explanationLabel, { color: isCorrect ? "#5ED19A" : "#F5C77A" }]}>
                      {t("session.quiz.explanation")}
                    </Text>
                  </RNView>
                  <Text style={q.explanationText}>{current.explanation}</Text>
                </RNView>
              );
            })()}
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

          {/* Fixed bottom buttons */}
          <RNView
            style={[q.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}
          >
            {(() => {
              const wasCorrect = answered && selectedIndex === (shuffled?.answerIndex ?? current.answerIndex);
              const nextBg = !answered ? "#1A2233" : wasCorrect ? "#5ED19A" : "#F5C77A";
              const nextTextColor = !answered ? "#4A5568" : "#0B0F14";
              return (
                <Pressable onPress={onNext} disabled={!answered} style={[q.nextBtn, { backgroundColor: nextBg }]}>
                  <Text style={[q.nextBtnText, { color: nextTextColor }]}>
                    {qIndex + 1 >= total ? t("session.quiz.finish") : t("common.next")}
                  </Text>
                </Pressable>
              );
            })()}

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(session)/summary",
                  params: {
                    contentId,
                    version,
                    lang,
                    correct: String(correctCountRef.current),
                    total: String(total),
                  },
                })
              }
              style={q.skipBtn}
            >
              <Text style={q.skipBtnText}>{t("session.quiz.skip")}</Text>
            </Pressable>
          </RNView>
        </>
      )}

      {/* Exit confirmation modal */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <RNView style={q.modalOverlay}>
          <RNView style={q.modalCard}>
            <Text style={q.modalTitle}>{t("session.quiz.exit_title")}</Text>
            <Text style={q.modalMessage}>{t("session.quiz.exit_message")}</Text>
            <RNView style={q.modalButtons}>
              <Pressable
                onPress={() => setShowExitModal(false)}
                style={q.modalBtnCancel}
              >
                <Text style={q.modalBtnCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace("/(tabs)/home")}
                style={q.modalBtnExit}
              >
                <Text style={q.modalBtnExitText}>{t("session.quiz.exit_confirm")}</Text>
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </Box>
  );
}

const q = StyleSheet.create({
  // Question card
  questionCard: {
    backgroundColor: "#121826",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderRadius: 22,
    padding: 20,
  },
  qNumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  qNumPill: {
    backgroundColor: "#F5C77A15",
    borderWidth: 1,
    borderColor: "#F5C77A30",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qNumText: {
    color: "#F5C77A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  correctBadge: {
    color: "#4A5568",
    fontSize: 12,
    fontWeight: "600",
  },
  questionText: {
    color: "#E6EAF2",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 28,
  },
  selectHint: {
    color: "#4A5568",
    fontSize: 12,
    marginTop: 14,
  },

  // Explanation box
  explanationBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  explanationCorrect: {
    backgroundColor: "#0B1C12",
    borderColor: "#5ED19A30",
  },
  explanationWrong: {
    backgroundColor: "#160C0C",
    borderColor: "#F5C77A30",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  explanationText: {
    color: "#C8CDD8",
    fontSize: 14,
    lineHeight: 22,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A2233",
    gap: 10,
  },
  nextBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2A3E",
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    color: "#4A5568",
    fontSize: 15,
    fontWeight: "600",
  },

  // Exit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: "#131C2E",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E2A3E",
    padding: 24,
    width: "100%",
    gap: 8,
  },
  modalTitle: {
    color: "#E6EAF2",
    fontSize: 18,
    fontWeight: "700",
  },
  modalMessage: {
    color: "#7B8193",
    fontSize: 14,
    lineHeight: 21,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2A3E",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancelText: {
    color: "#AAB0C0",
    fontSize: 15,
    fontWeight: "600",
  },
  modalBtnExit: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E26D6D18",
    borderWidth: 1,
    borderColor: "#E26D6D40",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnExitText: {
    color: "#E26D6D",
    fontSize: 15,
    fontWeight: "700",
  },
});
