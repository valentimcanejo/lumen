import React from "react";
import { HStack } from "../hstack";
import { Text } from "../text";
import { cn } from "../../../lib/cn";

export function Pill({
  icon,
  text,
  className,
}: {
  icon?: string;
  text: string;
  className?: string;
}) {
  return (
    <HStack
      className={cn(
        "bg-[#1A2233] rounded-full px-3 py-2 items-center",
        className,
      )}
      space="xs"
    >
      {icon ? <Text className="text-[#AAB0C0] text-[12px]">{icon}</Text> : null}
      <Text className="text-[#AAB0C0] text-[12px] font-medium">{text}</Text>
    </HStack>
  );
}
