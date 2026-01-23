import React from "react";
import { Button, ButtonText } from "../button";
import { cn } from "../../../lib/cn";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
};

export function LumenButton({
  children,
  onPress,
  variant = "primary",
  disabled,
  className,
}: Props) {
  const primary = variant === "primary";

  return (
    <Button
      onPress={onPress}
      isDisabled={disabled}
      className={cn(
        "h-[52px] rounded-2xl px-5 items-center justify-center",
        primary ? "bg-[#F5C77A]" : "bg-transparent border border-[#1A2233]",
        disabled && "opacity-60",
        className,
      )}
    >
      <ButtonText
        className={cn(
          "text-[16px] font-semibold",
          primary ? "text-[#0B0F14]" : "text-[#AAB0C0]",
        )}
      >
        {children}
      </ButtonText>
    </Button>
  );
}
