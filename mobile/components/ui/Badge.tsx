import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export type BadgeTone = "neutral" | "info" | "success" | "danger" | "purple" | "aubergine" | "citrine" | "wisteria";

const TONES: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: "#F3F4F6", text: "#4B5563" }, // gray-100 / gray-600
  info: { bg: "#DBEAFE", text: "#1E40AF" }, // blue-100 / blue-800
  success: { bg: colors.statusGreen, text: colors.blackberry }, // status-only green
  danger: { bg: "#FEE2E2", text: "#991B1B" }, // red-100 / red-800
  purple: { bg: "#EDE9FE", text: "#5B21B6" }, // purple-100 / purple-800
  aubergine: { bg: colors.aubergine, text: colors.white },
  citrine: { bg: colors.citrine, text: colors.blackberry },
  wisteria: { bg: colors.wisteria, text: colors.white },
};

type Props = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = "neutral", style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
});
