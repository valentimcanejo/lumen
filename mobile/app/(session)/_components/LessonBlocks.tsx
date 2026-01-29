import React from "react";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { LessonBlock } from "../../../models/pack";

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <VStack className="mt-6" space="md">
      {blocks.map((b, idx) => {
        if (b.type === "h2") {
          return (
            <Text
              key={idx}
              className="text-[#E6EAF2] text-[16px] font-semibold"
            >
              {b.text}
            </Text>
          );
        }

        if (b.type === "p") {
          return (
            <Text
              key={idx}
              className="text-[#AAB0C0] text-[14px] leading-[22px]"
            >
              {b.text}
            </Text>
          );
        }

        if (b.type === "quote") {
          return (
            <Box
              key={idx}
              className="bg-[#121826] border border-[#1A2233] rounded-[18px] p-4"
            >
              <Text className="text-[#E6EAF2] text-[14px] leading-[22px] italic">
                “{b.text}”
              </Text>
            </Box>
          );
        }

        if (b.type === "bullets") {
          return (
            <VStack key={idx} space="sm">
              {b.items.map((item, i) => (
                <Box key={i} className="flex-row">
                  <Text className="text-[#F5C77A] mr-2">•</Text>
                  <Text className="text-[#AAB0C0] text-[14px] leading-[22px] flex-1">
                    {item}
                  </Text>
                </Box>
              ))}
            </VStack>
          );
        }

        return null;
      })}
    </VStack>
  );
}
