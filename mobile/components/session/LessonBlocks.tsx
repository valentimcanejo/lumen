import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { LessonBlock } from "../../../models/pack";

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <View style={bl.container}>
      {blocks.map((b, idx) => {
        if (b.type === "h2") {
          return (
            <View key={idx} style={bl.h2Wrap}>
              <View style={bl.h2Accent} />
              <Text style={bl.h2}>{b.text}</Text>
            </View>
          );
        }

        if (b.type === "p") {
          return (
            <Text key={idx} style={bl.p}>{b.text}</Text>
          );
        }

        if (b.type === "quote") {
          return (
            <View key={idx} style={bl.quoteCard}>
              <View style={bl.quoteAccent} />
              <Text style={bl.quoteGlyph}>"</Text>
              <Text style={bl.quoteText}>{b.text}</Text>
            </View>
          );
        }

        if (b.type === "bullets") {
          return (
            <View key={idx} style={bl.bulletList}>
              {b.items.map((item, i) => (
                <View key={i} style={bl.bulletRow}>
                  <View style={bl.bulletDot} />
                  <Text style={bl.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }

        return null;
      })}
    </View>
  );
}

const bl = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 18,
  },

  // H2
  h2Wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  h2Accent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#F5C77A50",
    alignSelf: "stretch",
    minHeight: 20,
    flexShrink: 0,
  },
  h2: {
    color: "#E6EAF2",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
    flex: 1,
  },

  // Paragraph
  p: {
    color: "#AAB0C0",
    fontSize: 15,
    lineHeight: 24,
  },

  // Quote
  quoteCard: {
    backgroundColor: "#0E1420",
    borderWidth: 1,
    borderColor: "#1E2A3E",
    borderLeftWidth: 3,
    borderLeftColor: "#F5C77A60",
    borderRadius: 14,
    padding: 16,
  },
  quoteAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    borderRadius: 14,
  },
  quoteGlyph: {
    color: "#F5C77A40",
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 4,
  },
  quoteText: {
    color: "#C8CDD8",
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },

  // Bullets
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F5C77A",
    marginTop: 9,
    flexShrink: 0,
  },
  bulletText: {
    color: "#AAB0C0",
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
});
