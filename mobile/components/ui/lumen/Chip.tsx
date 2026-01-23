import React from "react";
import { Box } from "../box";
import { Text } from "../text";
import { cn } from "../../../lib/cn";

export function Chip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Box
      className={cn(
        "border border-[#1A2233] rounded-full px-3 py-1",
        className,
      )}
    >
      <Text className="text-[#7B8193] text-[12px]">{label}</Text>
    </Box>
  );
}
