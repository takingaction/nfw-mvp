import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Body, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  inverse?: boolean;
};

export function EmptyState({
  icon = "document-text-outline",
  title,
  message,
  actionLabel,
  onAction,
  actionVariant = "accent",
  inverse = false,
}: Props) {
  const tone = inverse ? "inverse" : "default";
  const muted = inverse ? "inverseMuted" : "muted";
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={36} color={inverse ? "rgba(255,255,255,0.7)" : colors.stone} />
      <Subheading tone={tone} style={styles.center}>
        {title}
      </Subheading>
      {message && (
        <Body tone={muted} style={styles.center}>
          {message}
        </Body>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant={actionVariant} size="sm" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16, gap: 8 },
  center: { textAlign: "center" },
  action: { marginTop: 8 },
});
