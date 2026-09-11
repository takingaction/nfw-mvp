import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { NfwPerkCard } from "@/components/perks/NfwPerkCard";
import { OfferCard } from "@/components/perks/OfferCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading } from "@/components/ui/Typography";
import { fetchNfwPerkBySlug, fetchOffer } from "@/lib/api/perks";
import { useCollections } from "@/lib/queries/perks";
import type { AccessOffer, NfwPerk, PerkCollection } from "@/types/perks";

type ResolvedItem =
  | { kind: "access"; order: number; offer: AccessOffer }
  | { kind: "nfw"; order: number; perk: NfwPerk };

/**
 * Web equivalent: app/perks/page.tsx with ?collection=slug (collection header + resolved items).
 * Items are resolved client-side exactly as on web: access_perk → GET /offers/{key} (offers[0]),
 * nfw_perk → GET /nfw-perks/slug/{slug}; sorted by item display_order.
 * Build phase: 4
 */
export default function PerkCollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const collections = useCollections();
  const collection = collections.data?.find((c) => c.slug === slug);

  const items = useQuery({
    queryKey: ["perks", "collection-items", collection?.id ?? slug],
    enabled: !!collection,
    queryFn: () => resolveItems(collection!),
    staleTime: 5 * 60 * 1000,
  });

  if (collections.isLoading) return <LoadingScreen />;
  if (collections.isError) return <ErrorScreen message={(collections.error as Error).message} onRetry={() => collections.refetch()} />;
  if (!collection) return <ErrorScreen message="This collection is no longer available." onRetry={() => router.replace("/(tabs)/perks")} />;

  return (
    <>
      <Stack.Screen options={{ title: collection.name }} />
      <Screen>
        <View style={styles.header}>
          <Heading>{collection.name}</Heading>
          {collection.description ? <Body tone="muted">{collection.description}</Body> : null}
          <Caption>
            {collection.item_count} offer{collection.item_count === 1 ? "" : "s"}
          </Caption>
        </View>

        {items.isLoading ? (
          <LoadingScreen />
        ) : (items.data?.length ?? 0) === 0 ? (
          <EmptyState icon="bag-handle-outline" title="Nothing here yet" message="This collection has no available offers right now." />
        ) : (
          <View style={styles.list}>
            {items.data!.map((it) =>
              it.kind === "access" ? (
                <OfferCard
                  key={`a-${it.offer.offer_key}`}
                  offer={it.offer}
                  nationwide
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/perks/[offerKey]",
                      params: { offerKey: String(it.offer.offer_key), storeKey: it.offer.offer_store?.store_key ? String(it.offer.offer_store.store_key) : "" },
                    })
                  }
                />
              ) : (
                <NfwPerkCard
                  key={`n-${it.perk.id}`}
                  perk={it.perk}
                  onPress={() => it.perk.slug && router.push({ pathname: "/(tabs)/perks/nfw/[slug]", params: { slug: it.perk.slug } })}
                />
              ),
            )}
          </View>
        )}
      </Screen>
    </>
  );
}

async function resolveItems(collection: PerkCollection): Promise<ResolvedItem[]> {
  const results = await Promise.all(
    collection.items.map(async (item): Promise<ResolvedItem | null> => {
      try {
        if (item.item_type === "access_perk") {
          const offer = await fetchOffer(item.item_identifier);
          return offer ? { kind: "access", order: item.display_order, offer } : null;
        }
        const perk = await fetchNfwPerkBySlug(item.item_identifier);
        return perk ? { kind: "nfw", order: item.display_order, perk } : null;
      } catch {
        return null; // offer expired / perk deactivated — skip silently like web
      }
    }),
  );
  return results.filter((r): r is ResolvedItem => r !== null).sort((a, b) => a.order - b.order);
}

const styles = StyleSheet.create({
  header: { gap: 6, marginBottom: 16 },
  list: { gap: 10 },
});
