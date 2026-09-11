import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Caption, Label } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { htmlToText } from "@/lib/html";
import { useOfferLocations } from "@/lib/queries/perks";
import type { UpstreamLocation } from "@/types/perks";

const DISTANCES = ["5mi", "10mi", "25mi", "50mi", "100mi"];

type Props = {
  offerGroupKey: string;
  profileZip: string | null;
  selectedKey: string | null;
  onSelect: (loc: { key: string; name: string; street: string }) => void;
};

/**
 * Web: the "Nearby Locations" card in components/perks/OfferDetailPanel.tsx.
 * ZIP override (session only) + distance (default 100mi) + up to 10 locations.
 * Selecting a location drives the location-specific offer_key lookup.
 */
export function LocationPicker({ offerGroupKey, profileZip, selectedKey, onSelect }: Props) {
  const [zipInput, setZipInput] = useState("");
  const [zip, setZip] = useState<string | undefined>(undefined);
  const [distance, setDistance] = useState("100mi");
  const locations = useOfferLocations(offerGroupKey, zip, distance);

  const heading = locations.isLoading
    ? "Finding nearby locations..."
    : selectedKey
      ? "Location Selected"
      : "Please Select a Location";

  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <Label>{heading}</Label>
        {selectedKey ? <Ionicons name="checkmark-circle" size={18} color={colors.aubergine} /> : null}
      </View>

      <View style={styles.controls}>
        <TextInput
          value={zipInput}
          onChangeText={(v) => setZipInput(v.replace(/\D/g, "").slice(0, 5))}
          placeholder="ZIP"
          placeholderTextColor="rgba(46,31,56,0.4)"
          keyboardType="number-pad"
          maxLength={5}
          style={styles.zip}
        />
        <View style={styles.distanceRow}>
          {DISTANCES.map((d) => (
            <Pressable key={d} onPress={() => setDistance(d)} style={[styles.chip, distance === d && styles.chipActive]}>
              <Text style={[styles.chipText, distance === d && styles.chipTextActive]}>{d.replace("mi", " mi")}</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Search" variant="primary" size="sm" onPress={() => setZip(zipInput.length === 5 ? zipInput : undefined)} />
      </View>
      <Caption>Leave blank to use your profile ZIP{profileZip ? ` (${profileZip})` : ""}</Caption>

      {locations.isLoading ? (
        <ActivityIndicator color={colors.aubergine} style={{ marginVertical: 12 }} />
      ) : (locations.data?.locations.length ?? 0) === 0 ? (
        <Caption style={{ marginTop: 8 }}>No locations found within {distance.replace("mi", " miles")}. Try a larger distance.</Caption>
      ) : (
        <View style={styles.list}>
          {locations.data!.locations.slice(0, 10).map((loc, i) => {
            const key = locKey(loc);
            const isSelected = key !== null && key === selectedKey;
            const street = locStreet(loc);
            return (
              <Pressable
                key={`${key ?? i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => key && onSelect({ key, name: locName(loc), street })}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{locName(loc)}</Text>
                  {street ? <Caption>{street}</Caption> : null}
                  <Caption>{locCityLine(loc)}</Caption>
                </View>
                {isSelected ? (
                  <View style={styles.selectedTag}>
                    <Ionicons name="checkmark" size={14} color={colors.aubergine} />
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

// --- helpers mirroring OfferDetailPanel.tsx getLocationName / getStreetAddress / etc. -------------

export function locKey(loc: UpstreamLocation): string | null {
  const k = loc.location_key ?? loc.physical_location?.location_key;
  return k === undefined || k === null ? null : String(k);
}
export function locName(loc: UpstreamLocation): string {
  return htmlToText(loc.location_name || loc.name || loc.physical_location?.location_name || "Unknown Location");
}
export function locStreet(loc: UpstreamLocation): string {
  const p = loc.physical_location;
  const street = loc.street_address || loc.address_line_1 || p?.street_address || p?.address_line_1 || "";
  const ext = loc.extended_street_address || loc.address_line_2 || p?.extended_street_address || p?.address_line_2 || "";
  return [street, ext].filter(Boolean).join(", ");
}
export function locCityLine(loc: UpstreamLocation): string {
  const p = loc.physical_location;
  const city = loc.city_locality || p?.city_locality || "";
  const state = loc.state_region || p?.state_region || "";
  const zip = loc.postal_code || p?.postal_code || "";
  const dist = locDistance(loc);
  const base = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
  return dist ? `${base} (${dist})` : base;
}
export function locDistance(loc: UpstreamLocation): string | null {
  if (typeof loc.search_distance === "number") return `${loc.search_distance.toFixed(1)} mi`;
  if (typeof loc.search_distance === "string" && loc.search_distance) return loc.search_distance;
  return loc.distance || loc.distance_miles || null;
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  controls: { gap: 8 },
  zip: { fontFamily: fonts.uiBold, fontSize: 14, color: theme.text, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, height: 40, width: 100, backgroundColor: colors.white },
  distanceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, height: 30, justifyContent: "center", borderWidth: 1, borderColor: theme.border, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.aubergine, borderColor: colors.aubergine },
  chipText: { fontFamily: fonts.uiBold, fontSize: 11, color: theme.text },
  chipTextActive: { color: colors.white },
  list: { marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: "transparent", borderBottomWidth: 1, borderBottomColor: theme.border },
  rowSelected: { backgroundColor: "rgba(46,31,56,0.06)", borderLeftColor: colors.aubergine },
  name: { fontFamily: fonts.uiBold, fontSize: 14, color: theme.text },
  selectedTag: { flexDirection: "row", alignItems: "center", gap: 2 },
  selectedText: { fontFamily: fonts.uiBold, fontSize: 11, color: colors.aubergine },
});
