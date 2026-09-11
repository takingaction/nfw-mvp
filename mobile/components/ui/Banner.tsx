import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Body, Heading } from "@/components/ui/Typography";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { colors } from "@/constants/colors";

type Surface = "wisteria" | "citrine" | "aubergine";

const SURFACES: Record<Surface, { bg: string; text: "inverse" | "default"; button: ButtonVariant }> = {
  wisteria: { bg: colors.wisteria, text: "inverse", button: "accent" },
  citrine: { bg: colors.citrine, text: "default", button: "primary" },
  aubergine: { bg: colors.aubergine, text: "inverse", button: "accent" },
};

type Props = {
  surface?: Surface;
  title?: string;
  message: string;
  note?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  onDismiss?: () => void;
};

/**
 * Full-width notice band. Web: components/ui/banner.tsx, dashboard inline banners.
 */
export function Banner({
  surface = "wisteria",
  title,
  message,
  note,
  actionLabel,
  onAction,
  actionLoading,
  actionDisabled,
  onDismiss,
}: Props) {
  const s = SURFACES[surface];
  return (
    <View style={[styles.banner, { backgroundColor: s.bg }]}>
      <View style={styles.content}>
        {title && (
          <Heading tone={s.text} style={styles.title}>
            {title}
          </Heading>
        )}
        <Body tone={s.text}>{message}</Body>
        {note && (
          <Body tone={s.text} style={styles.note}>
            {note}
          </Body>
        )}
        {actionLabel && onAction && (
          <Button
            label={actionLabel}
            variant={s.button}
            size="sm"
            onPress={onAction}
            loading={actionLoading}
            disabled={actionDisabled}
            style={styles.action}
          />
        )}
      </View>
      {onDismiss && (
        <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12} style={styles.dismiss}>
          <Ionicons name="close" size={20} color={s.text === "inverse" ? colors.white : colors.blackberry} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 18 },
  content: { flex: 1, gap: 8 },
  title: { fontSize: 22, lineHeight: 26, textTransform: "uppercase", letterSpacing: 0.5 },
  note: { fontSize: 13, lineHeight: 18 },
  action: { alignSelf: "flex-start", marginTop: 4 },
  dismiss: { marginLeft: 12, paddingTop: 2 },
});
