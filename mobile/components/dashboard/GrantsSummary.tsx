import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { GrantApplicationCard } from "@/components/grants/GrantApplicationCard";
import { GrantCycleCard } from "@/components/grants/GrantCycleCard";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading, Subheading } from "@/components/ui/Typography";
import { HIDDEN_GRANT_STATUSES, type GrantCycle, type GrantWithCycle } from "@/types/grants";

type Props = {
  grants: GrantWithCycle[];
  availableCycles: GrantCycle[];
};

/**
 * Web: components/dashboard/YourMicrograntsSection.tsx (wisteria band).
 * "Your Microgrants" + "New Application" · "Your Applications" · "Available Microgrants".
 */
export function GrantsSummary({ grants, availableCycles }: Props) {
  const router = useRouter();
  const visible = grants.filter((g) => !HIDDEN_GRANT_STATUSES.includes(g.status));

  return (
    <Section surface="wisteria">
      <View style={styles.header}>
        <Heading tone="inverse">Your Microgrants</Heading>
        <Button label="New Application" variant="accent" size="sm" onPress={() => router.push("/(tabs)/grants/apply")} />
      </View>

      <Subheading tone="inverse">Your Applications</Subheading>
      {visible.length === 0 ? (
        <EmptyState
          inverse
          icon="ribbon-outline"
          title="No grant applications yet"
          message="Apply for microgrants to receive financial support"
          actionLabel="Start Your First Application"
          onAction={() => router.push("/(tabs)/grants/apply")}
        />
      ) : (
        <View style={styles.list}>
          {visible.slice(0, 3).map((g) => (
            <GrantApplicationCard
              key={g.id}
              grant={g}
              variant="dashboard"
              onPress={() => router.push({ pathname: "/(tabs)/grants/[id]", params: { id: g.id } })}
            />
          ))}
          {visible.length > 3 && (
            <Button label={`View all ${visible.length} applications`} variant="ghost" size="sm" onPress={() => router.push("/(tabs)/grants/my-applications")} style={styles.viewAll} />
          )}
        </View>
      )}

      <Subheading tone="inverse" style={styles.secondHeading}>
        Available Microgrants
      </Subheading>
      {availableCycles.length === 0 ? (
        <EmptyState inverse icon="calendar-outline" title="No open grant cycles at this time" message="Check back soon for new opportunities" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {availableCycles.map((c) => (
            <GrantCycleCard key={c.id} cycle={c} compact onPress={() => router.push("/(tabs)/grants")} />
          ))}
        </ScrollView>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  list: { gap: 10 },
  viewAll: { alignSelf: "flex-start", borderColor: "#FFFFFF" },
  secondHeading: { marginTop: 8 },
  strip: { gap: 12, paddingRight: 20 },
});
