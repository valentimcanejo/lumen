import React, { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";
import { useAuth } from "../../../hooks/useAuth";
import { Text } from "../text";

type Category = "bug" | "content" | "suggestion" | "other";

const CATEGORIES: { id: Category; icon: string }[] = [
  { id: "bug", icon: "bug-outline" },
  { id: "content", icon: "document-text-outline" },
  { id: "suggestion", icon: "bulb-outline" },
  { id: "other", icon: "chatbubble-ellipses-outline" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SupportSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  function handleClose() {
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setMessage("");
      setCategory("bug");
      setSubmitted(false);
      setError(false);
    }, 300);
  }

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(false);
    try {
      await addDoc(collection(db, "support_requests"), {
        uid,
        category,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={0}
      >
        <View style={s.overlay}>
          <View
            style={[
              s.sheet,
              { paddingBottom: Math.max(insets.bottom + 16, 24) },
            ]}
          >
            {/* Handle */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>{t("support.title")}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={22} color="#AAB0C0" />
              </TouchableOpacity>
            </View>

            {submitted ? (
              <View style={s.successContainer}>
                <View style={s.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color="#5ED19A" />
                </View>
                <Text style={s.successTitle}>{t("support.success_title")}</Text>
                <Text style={s.successSubtitle}>
                  {t("support.success_subtitle")}
                </Text>
                <TouchableOpacity style={[s.submitBtn, { width: "100%" }]} onPress={handleClose}>
                  <Text style={s.submitBtnText}>{t("common.finish")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Category */}
                <Text style={s.label}>{t("support.category_label")}</Text>
                <View style={s.categoryRow}>
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={[s.catBtn, active && s.catBtnActive]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={18}
                          color={active ? "#F5C77A" : "#7B8193"}
                        />
                        <Text
                          style={[s.catLabel, active && s.catLabelActive]}
                          numberOfLines={1}
                        >
                          {t(`support.category_${cat.id}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Message */}
                <Text style={s.label}>{t("support.message_label")}</Text>
                <TextInput
                  style={s.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t("support.message_placeholder")}
                  placeholderTextColor="#4A5568"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={s.charCount}>
                  {message.length}/1000
                </Text>

                {error && (
                  <Text style={s.errorText}>{t("support.error")}</Text>
                )}

                <TouchableOpacity
                  style={[
                    s.submitBtn,
                    (!message.trim() || submitting) && s.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!message.trim() || submitting}
                >
                  <Text style={s.submitBtnText}>
                    {submitting ? t("common.loading") : t("support.submit")}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0E141E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#2A3448",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    color: "#E6EAF2",
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    color: "#AAB0C0",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  catBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1A2233",
  },
  catBtnActive: {
    borderColor: "#F5C77A55",
    backgroundColor: "#F5C77A10",
  },
  catLabel: {
    color: "#7B8193",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  catLabelActive: {
    color: "#F5C77A",
  },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1A2233",
    borderRadius: 16,
    padding: 14,
    color: "#E6EAF2",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    marginBottom: 6,
  },
  charCount: {
    color: "#4A5568",
    fontSize: 11,
    textAlign: "right",
    marginBottom: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  submitBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#F5C77A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#0B0F14",
    fontSize: 16,
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    color: "#E6EAF2",
    fontSize: 20,
    fontWeight: "700",
  },
  successSubtitle: {
    color: "#7B8193",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});
