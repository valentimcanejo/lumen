import React, { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import type { PackQuizQuestion } from "../../models/pack";
import { usePack } from "../../hooks/usePack";
import type { Lang } from "../../models/lang";

function TopProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box className="flex-1 h-[6px] rounded-full bg-[#1A2233] overflow-hidden">
      <Box style={{ width: `${pct * 100}%` }} className="h-full bg-[#F5C77A]" />
    </Box>
  );
}

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
  state: "idle" | "correct" | "wrong";
  onPress: () => void;
}) {
  const base =
    "rounded-[18px] border px-4 py-4 flex-row items-center justify-between";
  const idleBorder = selected ? "border-[#F5C77A]/60" : "border-[#1A2233]";
  const idleBg = selected ? "bg-[#121826]" : "bg-[#0E141E]";

  const correct = "border-[#5ED19A]/70 bg-[#0F1C16]";
  const wrong = "border-[#E26D6D]/70 bg-[#1C0F12]";

  const className =
    state === "idle"
      ? `${base} ${idleBorder} ${idleBg}`
      : state === "correct"
        ? `${base} ${correct}`
        : `${base} ${wrong}`;

  const dotColor =
    state === "idle"
      ? selected
        ? "#F5C77A"
        : "#2A3448"
      : state === "correct"
        ? "#5ED19A"
        : "#E26D6D";

  const textColor =
    state === "idle" ? "#E6EAF2" : state === "correct" ? "#DFF7EC" : "#F7E0E0";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={className}
      style={{ opacity: disabled ? 0.85 : 1 }}
    >
      <HStack className="items-center flex-1" space="md">
        <Box
          className="w-[10px] h-[10px] rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <Text
          className="text-[14px] leading-[20px]"
          style={{ color: textColor }}
        >
          {label}
        </Text>
      </HStack>

      <Box className="ml-3">
        {state === "correct" ? (
          <Ionicons name="checkmark-circle" size={18} color="#5ED19A" />
        ) : state === "wrong" ? (
          <Ionicons name="close-circle" size={18} color="#E26D6D" />
        ) : selected ? (
          <Ionicons name="radio-button-on" size={18} color="#F5C77A" />
        ) : (
          <Ionicons name="radio-button-off" size={18} color="#7B8193" />
        )}
      </Box>
    </Pressable>
  );
}

function getOptionState(args: {
  answered: boolean;
  optionIndex: number;
  selectedIndex: number | null;
  correctIndex: number;
}): "idle" | "correct" | "wrong" {
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

  const { pack, loading } = usePack({
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

  const current: PackQuizQuestion | undefined = quiz[qIndex];

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
    if (optionIdx === current.answerIndex) {
      setCorrectCount((v) => v + 1);
    }
  }

  function onNext() {
    if (!current) return;
    const next = qIndex + 1;
    if (next >= total) {
      router.push({
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

      <Box className="flex-1 px-5 pt-5">
        {loading ? (
          <Box className="flex-1 items-center justify-center">
            <Text className="text-[#AAB0C0]">{t("common.loading")}</Text>
          </Box>
        ) : !pack || total === 0 || !current ? (
          <VStack space="md" className="mt-3">
            <Text className="text-[#AAB0C0]">{t("session.quiz.empty")}</Text>

            <Pressable
              onPress={() =>
                router.push({
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
        ) : (
          <>
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
              {current.options.map((opt, idx) => {
                const state = getOptionState({
                  answered,
                  optionIndex: idx,
                  selectedIndex,
                  correctIndex: current.answerIndex,
                });

                return (
                  <OptionRow
                    key={idx}
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

            <Box className="mt-auto" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
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
    </Box>
  );
}
