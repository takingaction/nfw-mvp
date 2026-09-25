import { StyleSheet, Text } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

function formatPassExpiry(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " ET"
  );
}

/** Late Submission Pass badge — mirrors web GrantApplicationForm LatePassNote. */
export function LatePassNote({ expiresAt }: { expiresAt: string }) {
  return <Text style={styles.note}>Late submission approved — expires {formatPassExpiry(expiresAt)}</Text>;
}

const styles = StyleSheet.create({
  note: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.blackberry,
    backgroundColor: "rgba(119,134,190,0.2)",
    borderWidth: 1,
    borderColor: "rgba(119,134,190,0.4)",
  },
});
