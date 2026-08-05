import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/ui/text";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { trackEvent } from "../../services/analytics.service";

// ---------------------------------------------------------------------------
// Each step: label key, icon, how long to "run" before completing (ms)
// ---------------------------------------------------------------------------
type Step = { key: string; icon: keyof typeof Ionicons.glyphMap; duration: number };

const STEPS: Step[] = [
  { key: "step_profile",  icon: "person-outline",    duration: 700  },
  { key: "step_tracks",   icon: "globe-outline",     duration: 1000 },
  { key: "step_lesson",   icon: "book-outline",      duration: 800  },
];

const GOLD = "#F5C77A";
const DONE_COLOR = "#5ED19A";

// ---------------------------------------------------------------------------
// Single step row
// ---------------------------------------------------------------------------
function StepRow({
  label,
  icon,
  state,
  delay,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  state: "waiting" | "running" | "done";
  delay: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (state === "waiting") return;

    // Fade in when active
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();

    if (state === "running") {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      );
      spinLoop.current.start();
    } else {
      // done — stop spin
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const iconColor = state === "done" ? DONE_COLOR : GOLD;

  return (
    <Animated.View style={[s.row, { opacity: fadeAnim }]}>
      <View style={[s.iconWrap, { borderColor: iconColor + "40", backgroundColor: iconColor + "12" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <Text style={s.label}>{label}</Text>

      <View style={s.statusWrap}>
        {state === "running" && (
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="sync-outline" size={18} color={GOLD} />
          </Animated.View>
        )}
        {state === "done" && (
          <Ionicons name="checkmark-circle" size={20} color={DONE_COLOR} />
        )}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function SetupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uid } = useAuth();
  const { getUserData } = useUser();

  // Index of the currently running step (-1 = not started yet)
  const [activeStep, setActiveStep] = useState(0);
  // Which steps are done
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  const titleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    trackEvent("onboarding_step", { step: "setup" });

    Animated.timing(titleFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    runSetup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runSetup() {
    // Step 0 — profile (just a timed delay; data was saved in daily-time screen)
    await delay(STEPS[0].duration);
    setDoneSteps((prev) => new Set(prev).add(0));
    setActiveStep(1);

    // Step 1 — tracks (warm the user data cache so home loads instantly)
    const warmCache = uid
      ? getUserData({ userId: uid }).catch(() => {})
      : Promise.resolve();
    await Promise.all([warmCache, delay(STEPS[1].duration)]);
    setDoneSteps((prev) => new Set(prev).add(1));
    setActiveStep(2);

    // Step 2 — first lesson (small extra delay for feel)
    await delay(STEPS[2].duration);
    setDoneSteps((prev) => new Set(prev).add(2));
    setActiveStep(3); // all done

    // Brief pause to let the user see all checkmarks, then navigate
    await delay(600);
    trackEvent("onboarding_complete");
    router.replace("/(tabs)/home");
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>
      {/* Brand mark */}
      <View style={s.brand}>
        <Text style={s.brandName}>Lumen</Text>
        <View style={s.brandDot} />
      </View>

      {/* Title */}
      <Animated.View style={{ opacity: titleFade }}>
        <Text style={s.title}>{t("onboarding.setup.title")}</Text>
        <Text style={s.subtitle}>{t("onboarding.setup.subtitle")}</Text>
      </Animated.View>

      {/* Steps */}
      <View style={s.steps}>
        {STEPS.map((step, i) => {
          const state = doneSteps.has(i)
            ? "done"
            : activeStep === i
            ? "running"
            : "waiting";

          return (
            <StepRow
              key={step.key}
              label={t(`onboarding.setup.${step.key}`)}
              icon={step.icon}
              state={state}
              delay={0}
            />
          );
        })}
      </View>

      {/* Footer hint */}
      <Text style={s.footer}>{t("onboarding.setup.footer")}</Text>
    </View>
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F14",
    paddingHorizontal: 28,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 48,
  },
  brandName: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    marginTop: 2,
  },
  title: {
    color: "#E6EAF2",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
    marginBottom: 10,
  },
  subtitle: {
    color: "#AAB0C0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 48,
  },
  steps: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1A2233",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    color: "#E6EAF2",
    fontSize: 15,
    fontWeight: "500",
  },
  statusWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    color: "#3D4558",
    fontSize: 12,
    textAlign: "center",
    marginTop: "auto",
  },
});
