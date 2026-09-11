import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { usePerksFilters } from "@/stores/perksFilters";
import { DISTANCE_OPTIONS, NATIONWIDE_DISTANCE } from "@/types/perks";

/**
 * Web: components/perks/PerksSearch.tsx — text search, ZIP, distance, RESET.
 * Mobile: search field + Filters button on one row; ZIP + distance chips below.
 * Text search is debounced (400 ms) so typing doesn't spam the API.
 */
export function PerksSearchBar() {
  const router = useRouter();
  const f = usePerksFilters();
  const [text, setText] = useState(f.query);
  const [zip, setZip] = useState(f.postalCode);
  const [syncedZip, setSyncedZip] = useState(f.postalCode);
  // Store changed the ZIP (profile load, Nationwide, RESET) → mirror it into the input.
  if (f.postalCode !== syncedZip) {
    setSyncedZip(f.postalCode);
    setZip(f.postalCode);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== f.query) f.setQuery(text);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const activeFilterCount = f.categoryKeys.length + f.facets.length + f.offerTypes.length + (f.onlineOnly ? 1 : 0);
  const canReset =
    activeFilterCount > 0 ||
    f.query.length > 0 ||
    f.view !== "stores" ||
    f.nfwOnly ||
    (f.profileZip ? f.postalCode !== f.profileZip || f.distance !== "10mi" : f.distance !== NATIONWIDE_DISTANCE);
  const isNationwide = f.distance === NATIONWIDE_DISTANCE;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search for restaurants, activities, stores..."
            placeholderTextColor="rgba(46,31,56,0.4)"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => f.setQuery(text)}
            autoCorrect={false}
          />
          {text.length > 0 && (
            <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setText("")}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filters"
          onPress={() => router.push("/(tabs)/perks/filters")}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={20} color={colors.white} />
          {activeFilterCount > 0 && (
            <View style={styles.countBubble}>
              <Text style={styles.countText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={[styles.zipBox, isNationwide && styles.zipDisabled]}>
          <Ionicons name="location-outline" size={16} color={theme.textMuted} />
          <TextInput
            value={zip}
            editable={!isNationwide}
            onChangeText={(v) => setZip(v.replace(/\D/g, "").slice(0, 5))}
            onBlur={() => zip.length === 5 && zip !== f.postalCode && f.setPostalCode(zip)}
            onSubmitEditing={() => zip.length === 5 && f.setPostalCode(zip)}
            placeholder={isNationwide ? "Nationwide" : "ZIP"}
            placeholderTextColor="rgba(46,31,56,0.4)"
            keyboardType="number-pad"
            maxLength={5}
            style={styles.zipInput}
          />
        </View>
        <View style={styles.chips}>
          {DISTANCE_OPTIONS.map((d) => {
            const active = f.distance === d.value;
            return (
              <Pressable
                key={d.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => f.setDistance(d.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {canReset && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            f.resetAll();
            setText("");
          }}
          style={styles.reset}
        >
          <Ionicons name="refresh" size={14} color={colors.aubergine} />
          <Text style={styles.resetText}>RESET</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: { flex: 1, fontFamily: fonts.ui, fontSize: 15, color: theme.text, paddingVertical: 10 },
  filterButton: { width: 46, height: 46, backgroundColor: colors.aubergine, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.85 },
  countBubble: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.citrine,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countText: { fontFamily: fonts.uiBlack, fontSize: 10, color: colors.blackberry },
  zipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    height: 36,
    width: 96,
  },
  zipDisabled: { opacity: 0.5 },
  zipInput: { flex: 1, fontFamily: fonts.uiBold, fontSize: 14, color: theme.text, paddingVertical: 0 },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, height: 30, justifyContent: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: colors.aubergine, borderColor: colors.aubergine },
  chipText: { fontFamily: fonts.uiBold, fontSize: 11, color: theme.text },
  chipTextActive: { color: colors.white },
  reset: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  resetText: { fontFamily: fonts.uiBlack, fontSize: 11, letterSpacing: 0.6, color: colors.aubergine },
});
