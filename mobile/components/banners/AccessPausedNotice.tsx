import { Linking, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Caption, Label } from "@/components/ui/Typography";
import { ACCESS_PAUSED_EMAIL, ACCESS_PAUSED_MESSAGE } from "@/types/profile";

/**
 * Shown in place of the "Membership required" notice when an admin has paused
 * the member's access (profiles.access_paused_at). No upgrade prompt.
 */
export function AccessPausedNotice({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Card surface="citrine" bordered={false} style={[styles.notice, style]}>
      <Label>Access limited</Label>
      <Caption tone="default">{ACCESS_PAUSED_MESSAGE}</Caption>
      <Button
        label="Email us"
        variant="primary"
        size="sm"
        onPress={() => Linking.openURL(`mailto:${ACCESS_PAUSED_EMAIL}`)}
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  notice: { gap: 6 },
  button: { alignSelf: "flex-start", marginTop: 4 },
});
