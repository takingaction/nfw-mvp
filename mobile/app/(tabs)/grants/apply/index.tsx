import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";

import { GrantCycleCard } from "@/components/grants/GrantCycleCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { env } from "@/lib/env";
import { useOpenGrantCycles } from "@/lib/queries/grants";

/**
 * Web equivalent:
 *   - app/grants/apply/page.tsx
 *   - components/GrantApplicationForm.tsx
 *   - POST /api/grants/create, POST /api/grants/upload-document
 * Build phase: 3
 *
 * INTERIM (Slice A): the native form requires the web API to accept Bearer tokens
 * (mobile/migration-blueprint.md → Dependencies #1). Until then this screen shows the
 * selected cycle and hands off to the web form in the system browser.
 */
export default function GrantApplyScreen() {
  const router = useRouter();
  const { cycleId } = useLocalSearchParams<{ cycleId?: string }>();
  const cycles = useOpenGrantCycles();
  const selected = cycles.data?.find((c) => c.id === cycleId) ?? null;

  const webUrl = `${env.siteUrl}/grants/apply`;

  return (
    <Screen>
      <Heading>Apply for a Microgrant</Heading>
      <Body tone="muted" style={styles.intro}>
        {selected ? "You're applying for:" : "Choose a grant cycle on the previous screen, or continue on the website."}
      </Body>

      {selected && (
        <View style={styles.cycle}>
          <GrantCycleCard cycle={selected} onPress={() => {}} />
        </View>
      )}

      <Card surface="citrine" bordered={false} style={styles.notice}>
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle" size={22} color={colors.blackberry} />
          <Label>Application form coming to the app soon</Label>
        </View>
        <Caption tone="default">
          For now, applications are submitted on nationalfundforwomen.org. You&apos;ll be signed in with the same account, and your application will appear here under My Applications.
        </Caption>
        <Button label="Continue on the website" variant="primary" onPress={() => Linking.openURL(webUrl)} />
      </Card>

      <Button label="Back to Microgrants" variant="ghost" onPress={() => router.back()} style={styles.back} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 6, marginBottom: 16 },
  cycle: { marginBottom: 16 },
  notice: { gap: 12 },
  noticeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { marginTop: 16 },
});
