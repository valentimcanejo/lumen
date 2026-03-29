import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Pressable } from "../pressable";
import { Text } from "../text";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  className?: string;
  color?: string;
};

export function LumenButton({
  children,
  onPress,
  variant = "primary",
  disabled,
  color,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const primary = variant === "primary";
  const bg = primary ? (color ?? "#F5C77A") : "transparent";
  const borderBottom = primary ? (color ? darken(color) : "#C49B4A") : "#1A2233";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        s.base,
        primary
          ? { backgroundColor: bg, borderBottomColor: borderBottom, borderBottomWidth: 4 }
          : s.ghost,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.label, { color: primary ? "#0B0F14" : "#AAB0C0" }]}>
        {children}
      </Text>
    </Pressable>
  );
}

function darken(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 40);
  const g = Math.max(0, ((n >> 8) & 0xff) - 40);
  const b = Math.max(0, (n & 0xff) - 40);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const s = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: "#1A2233",
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.975 }] },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
