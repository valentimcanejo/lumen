import React from "react";
import { Box } from "../box";
import { cn } from "../../../lib/cn";

export function LumenCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Box
      className={cn(
        "bg-[#121826] border border-[#1A2233] rounded-[18px] p-5",
        className,
      )}
    >
      {children}
    </Box>
  );
}
