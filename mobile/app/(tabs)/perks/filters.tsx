import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useCategories, useFacets } from "@/lib/queries/perks";
import { usePerksFilters } from "@/stores/perksFilters";
import { OFFER_TYPE_OPTIONS, type CategoryNode } from "@/types/perks";

/**
 * Web equivalent: components/perks/FilterSidebar.tsx
 *   Online Only · Categories (tree, multi-select) · Facets (Cuisine / Store Type / Activities) · Offer Type
 *   "Reset" clears only these (not ZIP / distance / query).
 * Build phase: 4
 */
export default function PerksFiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = usePerksFilters();
  const categories = useCategories();
  const facets = useFacets();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const active = f.hasActiveFilters();

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}>
        <CheckRow label="Online Only" checked={f.onlineOnly} onPress={() => f.setOnlineOnly(!f.onlineOnly)} />

        <SectionTitle>Categories</SectionTitle>
        {categories.isLoading && <Caption>Loading categories…</Caption>}
        {(categories.data ?? []).map((cat) => (
          <View key={cat.category_key}>
            <View style={styles.parentRow}>
              <CheckRow
                label={cat.category_name}
                checked={f.categoryKeys.includes(cat.category_key)}
                onPress={() => f.toggleCategory(cat.category_key)}
                style={{ flex: 1 }}
              />
              {cat.subcategories && cat.subcategories.length > 0 && (
                <Pressable accessibilityLabel="Toggle subcategories" hitSlop={8} onPress={() => toggleCollapsed(String(cat.category_key))} style={styles.chevron}>
                  <Ionicons name={collapsed.has(String(cat.category_key)) ? "chevron-down" : "chevron-up"} size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>
            {!collapsed.has(String(cat.category_key)) &&
              (cat.subcategories ?? []).map((sub: CategoryNode) => (
                <CheckRow
                  key={sub.category_key}
                  label={sub.category_name}
                  checked={f.categoryKeys.includes(sub.category_key)}
                  onPress={() => f.toggleCategory(sub.category_key)}
                  indent
                />
              ))}
          </View>
        ))}

        {(facets.data ?? []).map((facet) => (
          <View key={facet.key}>
            <Pressable onPress={() => toggleCollapsed(`facet:${facet.key}`)} style={styles.facetHeader}>
              <SectionTitle>{facet.label}</SectionTitle>
              <Ionicons name={collapsed.has(`facet:${facet.key}`) ? "chevron-down" : "chevron-up"} size={18} color={theme.textMuted} />
            </Pressable>
            {!collapsed.has(`facet:${facet.key}`) &&
              facet.values.map((v) => (
                <CheckRow key={v.key} label={v.label} checked={f.facets.includes(v.key)} onPress={() => f.toggleFacet(v.key)} indent />
              ))}
          </View>
        ))}

        <SectionTitle>Offer Type</SectionTitle>
        {OFFER_TYPE_OPTIONS.map((o) => (
          <CheckRow key={o.value} label={o.label} checked={f.offerTypes.includes(o.value)} onPress={() => f.toggleOfferType(o.value)} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button label="Reset" variant="ghost" size="sm" disabled={!active} onPress={f.resetFilters} />
        <Button label="Show results" variant="accent" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Subheading style={styles.sectionTitle}>
      {children}
    </Subheading>
  );
}

function CheckRow({ label, checked, onPress, indent, style }: { label: string; checked: boolean; onPress: () => void; indent?: boolean; style?: object }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={[styles.checkRow, indent && styles.indent, style]}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color={colors.white} />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 2 },
  sectionTitle: { marginTop: 20, marginBottom: 8, fontSize: 16 },
  parentRow: { flexDirection: "row", alignItems: "center" },
  chevron: { padding: 8 },
  facetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  indent: { paddingLeft: 28 },
  box: { width: 20, height: 20, borderWidth: 1.5, borderColor: colors.aubergine, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  boxChecked: { backgroundColor: colors.wisteria, borderColor: colors.wisteria },
  checkLabel: { fontFamily: fonts.ui, fontSize: 15, color: theme.text, flex: 1 },
  footer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
});
