import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

export function SessionError({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <Box className="flex-1 bg-[#0B0F14] items-center justify-center px-8">
      <View style={s.iconWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#E26D6D" />
      </View>
      <Text style={s.title}>{t("common.error_connect")}</Text>
      {message ? <Text style={s.subtitle}>{message}</Text> : null}
      <Pressable style={s.btn} onPress={() => router.back()}>
        <Text style={s.btnText}>{t("common.back")}</Text>
      </Pressable>
    </Box>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { color: "#E6EAF2", fontSize: 17, fontWeight: "600", textAlign: "center" },
  subtitle: { color: "#AAB0C0", fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 18 },
  btn: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  btnText: { color: "#AAB0C0", fontSize: 15, fontWeight: "600" },
});
