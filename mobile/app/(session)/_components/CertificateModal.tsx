import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { trackColor } from "../../../constants/tracks";

type Props = {
  visible: boolean;
  trackId: string;
  trackName: string;
  userName: string;
  completedDate: string; // YYYY-MM-DD
  onClose: () => void;
};

function formatDate(ymd: string, lang: string): string {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return ymd;
  }
}

export function CertificateModal({ visible, trackId, trackName, userName, completedDate, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const color = trackColor(trackId);

  async function handleShare() {
    if (!shotRef.current) return;
    setSharing(true);
    try {
      const uri = await (shotRef.current as any).capture();
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("certificate.share_title") });
    } catch {
      // share cancelled or failed — no-op
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          {/* Certificate card — captured as image */}
          <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
            <View style={[s.card, { borderColor: color + "40" }]}>
              {/* Top accent line */}
              <View style={[s.topLine, { backgroundColor: color }]} />

              <View style={s.cardContent}>
                {/* Header */}
                <Text style={[s.appName, { color }]}>LUMEN</Text>
                <Text style={s.certLabel}>{t("certificate.label")}</Text>

                <View style={[s.divider, { backgroundColor: color + "30" }]} />

                {/* Body */}
                <Text style={s.certThis}>{t("certificate.this_certifies")}</Text>
                <Text style={s.userName} numberOfLines={2}>{userName}</Text>
                <Text style={s.certCompleted}>{t("certificate.completed")}</Text>
                <Text style={[s.trackName, { color }]} numberOfLines={2}>{trackName}</Text>

                <View style={[s.divider, { backgroundColor: color + "30" }]} />

                {/* Footer */}
                <Text style={s.dateLabel}>{formatDate(completedDate, i18n.language)}</Text>
                <Text style={s.appUrl}>lumen.app</Text>
              </View>
            </View>
          </ViewShot>

          {/* Actions */}
          <TouchableOpacity
            style={[s.shareBtn, { backgroundColor: color }]}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
          >
            {sharing ? (
              <ActivityIndicator color="#0B0F14" size="small" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#0B0F14" />
                <Text style={s.shareBtnText}>{t("certificate.share")}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>{t("common.close")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000CC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  card: {
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  topLine: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    padding: 28,
    alignItems: "center",
  },
  appName: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 4,
  },
  certLabel: {
    color: "#E6EAF2",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 20,
  },
  certThis: {
    color: "#7B8193",
    fontSize: 12,
    marginBottom: 8,
  },
  userName: {
    color: "#E6EAF2",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  certCompleted: {
    color: "#7B8193",
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  trackName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  dateLabel: {
    color: "#AAB0C0",
    fontSize: 12,
    marginBottom: 4,
  },
  appUrl: {
    color: "#4A5568",
    fontSize: 11,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 16,
    width: "100%",
  },
  shareBtnText: {
    color: "#0B0F14",
    fontSize: 15,
    fontWeight: "700",
  },
  closeBtn: {
    paddingVertical: 10,
  },
  closeBtnText: {
    color: "#7B8193",
    fontSize: 14,
  },
});
