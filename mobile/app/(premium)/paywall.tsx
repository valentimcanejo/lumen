import React, { useEffect, useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { HStack } from "../../components/ui/hstack";
import { useAuth } from "../../hooks/useAuth";
import { usePremium } from "../../hooks/usePremium";
import { trackEvent } from "../../services/analytics.service";

type Plan = "annual" | "monthly";
type FeedbackModal = "success" | "restored" | "none_found" | "error" | null;

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

function FeedbackOverlay({
  type,
  onClose,
}: {
  type: FeedbackModal;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!type) return null;

  const isSuccess = type === "success" || type === "restored";

  const config = {
    success: {
      icon: "sparkles" as const,
      iconColor: "#F5C77A",
      iconBg: "#F5C77A22",
      title: t("premium.success_title"),
      subtitle: t("premium.success_subtitle"),
      cta: t("premium.success_cta"),
      ctaBg: "#F5C77A",
      ctaColor: "#0B0F14",
    },
    restored: {
      icon: "checkmark-circle" as const,
      iconColor: "#50C878",
      iconBg: "#50C87822",
      title: t("premium.restore_success"),
      subtitle: t("premium.success_subtitle"),
      cta: t("premium.success_cta"),
      ctaBg: "#F5C77A",
      ctaColor: "#0B0F14",
    },
    none_found: {
      icon: "information-circle" as const,
      iconColor: "#AAB0C0",
      iconBg: "#AAB0C022",
      title: t("premium.restore_none"),
      subtitle: "",
      cta: "OK",
      ctaBg: "#1A2233",
      ctaColor: "#E6EAF2",
    },
    error: {
      icon: "alert-circle" as const,
      iconColor: "#E0115F",
      iconBg: "#E0115F22",
      title: t("premium.purchase_error"),
      subtitle: "",
      cta: "OK",
      ctaBg: "#1A2233",
      ctaColor: "#E6EAF2",
    },
  }[type];

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000CC",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 24,
            padding: 32,
            width: "100%",
            alignItems: "center",
            borderWidth: 1,
            borderColor: isSuccess ? "#F5C77A33" : "#1A2233",
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: config.iconBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name={config.icon} size={32} color={config.iconColor} />
          </View>

          {/* Title */}
          <Text
            style={{
              color: "#E6EAF2",
              fontSize: 22,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: config.subtitle ? 10 : 24,
            }}
          >
            {config.title}
          </Text>

          {/* Subtitle */}
          {!!config.subtitle && (
            <Text
              style={{
                color: "#AAB0C0",
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 28,
              }}
            >
              {config.subtitle}
            </Text>
          )}

          {/* CTA */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              backgroundColor: config.ctaBg,
              borderRadius: 14,
              height: 48,
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: config.ctaColor, fontSize: 15, fontWeight: "700" }}>
              {config.cta}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Shown once, right after a successful purchase — never blocks the purchase
// itself. Cancelling the native picker just dismisses this, no error shown.
function LinkInviteOverlay({
  visible,
  linking,
  onLink,
  onSkip,
}: {
  visible: boolean;
  linking: boolean;
  onLink: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000CC",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 24,
            padding: 32,
            width: "100%",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#F5C77A33",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#F5C77A22",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="shield-checkmark" size={32} color="#F5C77A" />
          </View>

          <Text
            style={{
              color: "#E6EAF2",
              fontSize: 22,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {t("premium.link_invite_title")}
          </Text>

          <Text
            style={{
              color: "#AAB0C0",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 28,
            }}
          >
            {t("premium.link_invite_subtitle")}
          </Text>

          <TouchableOpacity
            onPress={onLink}
            disabled={linking}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#F5C77A",
              borderRadius: 14,
              height: 48,
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {linking ? (
              <ActivityIndicator color="#0B0F14" />
            ) : (
              <Text style={{ color: "#0B0F14", fontSize: 15, fontWeight: "700" }}>
                {t("premium.link_invite_cta")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} disabled={linking} activeOpacity={0.7}>
            <Text style={{ color: "#4A5568", fontSize: 13, fontWeight: "600" }}>
              {t("premium.link_invite_skip")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function Paywall() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [processing, setProcessing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackModal>(null);
  const [showLinkInvite, setShowLinkInvite] = useState(false);
  const [linking, setLinking] = useState(false);

  const { isAnonymous, signInWithGoogle } = useAuth();
  const { annualPackage, monthlyPackage, purchasePlan, restorePurchases } = usePremium();

  useEffect(() => {
    trackEvent("paywall_view");
  }, []);

  // Dynamic prices from RevenueCat packages, fallback to i18n strings
  const annualPrice = annualPackage
    ? `${annualPackage.product.priceString}${t("premium.per_year")}`
    : t("premium.plan_annual_price");
  const monthlyPrice = monthlyPackage
    ? `${monthlyPackage.product.priceString}${t("premium.per_month")}`
    : t("premium.plan_monthly_price");

  function handleFeedbackClose() {
    const wasSuccess = feedback === "success";
    const shouldClose = feedback === "success" || feedback === "restored";
    setFeedback(null);
    if (wasSuccess && isAnonymous) {
      setShowLinkInvite(true);
    } else if (shouldClose) {
      router.back();
    }
  }

  async function handleLinkAccount() {
    setLinking(true);
    try {
      await signInWithGoogle();
      trackEvent("account_link", { source: "post_purchase", result: "linked" });
    } catch {
      // Cancelled or failed — linking is optional, never block on it.
    } finally {
      setLinking(false);
      setShowLinkInvite(false);
      router.back();
    }
  }

  function handleSkipLink() {
    trackEvent("account_link", { source: "post_purchase", result: "skipped" });
    setShowLinkInvite(false);
    router.back();
  }

  async function handleSubscribe() {
    setProcessing(true);
    const pkg = selectedPlan === "annual" ? annualPackage : monthlyPackage;
    trackEvent("purchase_start", { plan: selectedPlan });
    try {
      if (!pkg) { setFeedback("error"); return; }

      const success = await purchasePlan(pkg);
      if (success) {
        setFeedback("success");
        trackEvent("purchase", {
          value: pkg.product.price,
          currency: pkg.product.currencyCode,
          item_id: pkg.product.identifier,
        });
      }
    } catch {
      setFeedback("error");
      trackEvent("purchase_error", { plan: selectedPlan });
    } finally {
      setProcessing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const active = await restorePurchases();
      setFeedback(active ? "restored" : "none_found");
      if (active) trackEvent("purchase_restore");
    } catch {
      setFeedback("error");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <FeedbackOverlay type={feedback} onClose={handleFeedbackClose} />
      <LinkInviteOverlay
        visible={showLinkInvite}
        linking={linking}
        onLink={handleLinkAccount}
        onSkip={handleSkipLink}
      />

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
          <FeatureRow icon="🎙️" title={t("premium.feature_1_title")} desc={t("premium.feature_1_desc")} />
          <FeatureRow icon="📚" title={t("premium.feature_2_title")} desc={t("premium.feature_2_desc")} />
          <FeatureRow icon="⚡" title={t("premium.feature_3_title")} desc={t("premium.feature_3_desc")} />
          <FeatureRow icon="🔥" title={t("premium.feature_4_title")} desc={t("premium.feature_4_desc")} />
          <FeatureRow icon="📊" title={t("premium.feature_5_title")} desc={t("premium.feature_5_desc")} />
          <FeatureRow icon="📖" title={t("premium.feature_6_title")} desc={t("premium.feature_6_desc")} />
          <FeatureRow icon="🏆" title={t("premium.feature_7_title")} desc={t("premium.feature_7_desc")} />
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
                      {annualPrice}
                    </Text>
                    <Box
                      style={{
                        backgroundColor: "#50C87822",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: "#50C87855",
                      }}
                    >
                      <Text style={{ color: "#50C878", fontSize: 10, fontWeight: "800" }}>
                        −50%
                      </Text>
                    </Box>
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
                    {monthlyPrice}
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
