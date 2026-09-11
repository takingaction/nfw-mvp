import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LikeButton } from "@/components/perks/LikeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/Screen";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useLikedStores } from "@/stores/likedStores";
import type { LikedStore } from "@/types/perks";

/**
 * Web equivalent: components/dashboard/SavedBrandsPanel.tsx
 * Access Perks stores have numeric store_key → store offers screen.
 * NFW partners are stored with store_key = partner_name → NFW Exclusive list.
 * Build phase: 4
 */
export default function SavedBrandsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stores, loaded, loading, load } = useLikedStores();

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  if (!loaded && loading) return <LoadingScreen />;

  function open(store: LikedStore) {
    const numeric = /^\d+$/.test(store.store_key);
    if (numeric) {
      router.push({ pathname: "/(tabs)/perks/store/[storeKey]", params: { storeKey: store.store_key, name: store.store_name, logo: store.logo_url ?? "" } });
    } else {
      router.push("/(tabs)/perks");
    }
  }

  return (
    <FlatList
      data={stores}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.logo} contentFit="contain" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Ionicons name="storefront-outline" size={20} color={colors.aubergine} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Subheading numberOfLines={1} style={styles.name}>
              {item.store_name}
            </Subheading>
            <Text style={styles.cta}>View Offers ›</Text>
          </View>
          <LikeButton storeKey={item.store_key} storeName={item.store_name} logoUrl={item.logo_url} />
        </Pressable>
      )}
      ListHeaderComponent={<Caption style={styles.count}>{stores.length} saved brand{stores.length === 1 ? "" : "s"}</Caption>}
      ListEmptyComponent={
        <EmptyState icon="heart-outline" title="No saved brands yet" message="Tap the heart on any store to save it here." actionLabel="Explore Perks" onAction={() => router.push("/(tabs)/perks")} />
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16 },
  count: { marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, padding: 12 },
  pressed: { opacity: 0.9 },
  logo: { width: 48, height: 48 },
  logoFallback: { backgroundColor: colors.dove, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15 },
  cta: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.aubergine, marginTop: 2 },
});
