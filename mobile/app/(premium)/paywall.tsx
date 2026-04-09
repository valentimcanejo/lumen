import React, { useState } from "react";
import { ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { HStack } from "../../components/ui/hstack";
import { useAuth } from "../../hooks/useAuth";
import { usePremium } from "../../hooks/usePremium";

type Plan = "annual" | "monthly";

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <HStack space="md" style={{ alignItems: "flex-start", marginBottom: 20 }}>
      <Box
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "#F5C77A22",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </Box>
      <Box style={{ flex: 1 }}>
        <Text style={{ color: "#E6EAF2", fontSize: 15, fontWeight: "600", marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ color: "#AAB0C0", fontSize: 13, lineHeight: 19 }}>
          {desc}
        </Text>
      </Box>
    </HStack>
  );
}

export default function Paywall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [processing, setProcessing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { isAnonymous, signInWithGoogle } = useAuth();
  const { annualPackage, monthlyPackage, purchasePlan, restorePurchases } = usePremium();

  async function handleSubscribe() {
    setProcessing(true);
    try {
      // Require sign-in before purchase
      if (isAnonymous) {
        await signInWithGoogle();
      }

      const pkg = selectedPlan === "annual" ? annualPackage : monthlyPackage;
      if (!pkg) {
        Alert.alert(t("premium.purchase_error"));
        return;
      }

      const success = await purchasePlan(pkg);
      if (success) router.back();
    } catch {
      Alert.alert(t("premium.purchase_error"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) {
        Alert.alert(t("premium.restore_success"), undefined, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t("premium.restore_none"));
      }
    } catch {
      Alert.alert(t("premium.purchase_error"));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: insets.top + 12,
          right: 20,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#1A2233",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="close" size={18} color="#AAB0C0" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: Math.max(insets.bottom + 24, 40),
          paddingHorizontal: 24,
        }}
      >
        {/* Badge */}
        <HStack style={{ justifyContent: "center", marginBottom: 20 }}>
          <HStack
            space="xs"
            style={{
              backgroundColor: "#F5C77A22",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignItems: "center",
            }}
          >
            <Ionicons name="sparkles" size={13} color="#F5C77A" />
            <Text style={{ color: "#F5C77A", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
              {t("premium.badge")}
            </Text>
          </HStack>
        </HStack>

        {/* Headline */}
        <Text
          style={{
            color: "#E6EAF2",
            fontSize: 30,
            fontWeight: "800",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {t("premium.headline")}
        </Text>
        <Text
          style={{
            color: "#AAB0C0",
            fontSize: 15,
            textAlign: "center",
            marginBottom: 36,
          }}
        >
          {t("premium.subtitle")}
        </Text>

        {/* Features */}
        <Box style={{ marginBottom: 32 }}>
          <FeatureRow icon="✨" title={t("premium.feature_1_title")} desc={t("premium.feature_1_desc")} />
          <FeatureRow icon="📰" title={t("premium.feature_2_title")} desc={t("premium.feature_2_desc")} />
          <FeatureRow icon="🎯" title={t("premium.feature_3_title")} desc={t("premium.feature_3_desc")} />
        </Box>

        {/* Plan selector */}
        <Box style={{ gap: 10, marginBottom: 24 }}>
          {/* Annual */}
          <TouchableOpacity onPress={() => setSelectedPlan("annual")} activeOpacity={0.8}>
            <Box
              style={{
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selectedPlan === "annual" ? "#F5C77A" : "#1A2233",
                backgroundColor: selectedPlan === "annual" ? "#1C2030" : "#111827",
                padding: 16,
              }}
            >
              <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <HStack space="sm" style={{ alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: "#E6EAF2", fontSize: 16, fontWeight: "700" }}>
                      {t("premium.plan_annual_price")}
                    </Text>
                    <Box
                      style={{
                        backgroundColor: "#F5C77A",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: "#0B0F14", fontSize: 10, fontWeight: "800" }}>
                        {t("premium.plan_annual_label")}
                      </Text>
                    </Box>
                  </HStack>
                  <Text style={{ color: "#AAB0C0", fontSize: 12 }}>
                    {t("premium.plan_annual_monthly")}
                  </Text>
                </Box>
                <Box
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selectedPlan === "annual" ? "#F5C77A" : "#2A3448",
                    backgroundColor: selectedPlan === "annual" ? "#F5C77A" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedPlan === "annual" && (
                    <Ionicons name="checkmark" size={13} color="#0B0F14" />
                  )}
                </Box>
              </HStack>
            </Box>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity onPress={() => setSelectedPlan("monthly")} activeOpacity={0.8}>
            <Box
              style={{
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selectedPlan === "monthly" ? "#F5C77A" : "#1A2233",
                backgroundColor: selectedPlan === "monthly" ? "#1C2030" : "#111827",
                padding: 16,
              }}
            >
              <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Text style={{ color: "#E6EAF2", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
                    {t("premium.plan_monthly_price")}
                  </Text>
                  <Text style={{ color: "#AAB0C0", fontSize: 12 }}>
                    {t("premium.plan_monthly_label")}
                  </Text>
                </Box>
                <Box
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selectedPlan === "monthly" ? "#F5C77A" : "#2A3448",
                    backgroundColor: selectedPlan === "monthly" ? "#F5C77A" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedPlan === "monthly" && (
                    <Ionicons name="checkmark" size={13} color="#0B0F14" />
                  )}
                </Box>
              </HStack>
            </Box>
          </TouchableOpacity>
        </Box>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={processing}
          activeOpacity={0.85}
          style={{
            backgroundColor: processing ? "#A88B50" : "#F5C77A",
            borderRadius: 16,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          {processing ? (
            <ActivityIndicator color="#0B0F14" />
          ) : (
            <Text style={{ color: "#0B0F14", fontSize: 16, fontWeight: "700" }}>
              {t("premium.cta")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Fine print */}
        <Text style={{ color: "#4A5568", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
          {t("premium.fine_print")}
        </Text>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7}>
          <Text style={{ color: "#4A5568", fontSize: 12, textAlign: "center" }}>
            {restoring ? "..." : t("premium.restore")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Box>
  );
}
