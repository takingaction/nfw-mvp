import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Body, Caption, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { extractLinks, htmlToText } from "@/lib/html";

/** Promo code with copy button. Web: the citrine "Promo Code:" block. */
export function PromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.promo}>
      <View style={{ flex: 1 }}>
        <Caption tone="default">Promo Code</Caption>
        <Text style={styles.promoCode} selectable>
          {code}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy promo code"
        onPress={async () => {
          await Clipboard.setStringAsync(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        style={styles.copy}
      >
        <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={colors.blackberry} />
        <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Renders partner-authored HTML instructions as text + tappable links.
 * Web: `dangerouslySetInnerHTML` on display_message.
 */
export function HtmlInstructions({ html }: { html: string }) {
  const text = htmlToText(html);
  const links = extractLinks(html);
  return (
    <View style={{ gap: 8 }}>
      {text ? <Body style={styles.instructions}>{text}</Body> : null}
      {links.map((l) => (
        <Pressable key={l.href} onPress={() => WebBrowser.openBrowserAsync(l.href)} style={styles.linkRow}>
          <Ionicons name="open-outline" size={14} color={colors.aubergine} />
          <Text style={styles.link} numberOfLines={1}>
            {l.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export type RedemptionOutcome =
  | { kind: "link"; url: string | null; promoCode: string | null; message: string | null }
  | { kind: "coupon"; method: "instore" | "instore_print"; url: string | null; promoCode: string | null; locationLabel: string | null }
  | { kind: "call"; phone: string | null; promoCode: string | null; message: string | null }
  | { kind: "error"; message: string };

/** Result card shown after a successful/failed redemption. */
export function RedemptionResultCard({ outcome, onDismiss }: { outcome: RedemptionOutcome; onDismiss: () => void }) {
  if (outcome.kind === "error") {
    return (
      <Card style={[styles.card, styles.errorCard]}>
        <View style={styles.headerRow}>
          <Ionicons name="alert-circle" size={20} color={colors.statusRed} />
          <Label>Error</Label>
        </View>
        <Body>{outcome.message}</Body>
        <Button label="Dismiss" variant="ghost" size="sm" onPress={onDismiss} />
      </Card>
    );
  }

  return (
    <Card style={[styles.card, styles.successCard]}>
      <View style={styles.headerRow}>
        <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
        <Label>{outcome.kind === "call" ? "Call to Redeem" : outcome.kind === "coupon" ? "Coupon Ready" : "Offer Redeemed"}</Label>
      </View>

      {outcome.kind === "link" && (
        <>
          <Body>{outcome.message ?? "Tap 'Open Website' to visit the offer page."}</Body>
          {outcome.url && <Button label="Open Website" variant="primary" onPress={() => WebBrowser.openBrowserAsync(outcome.url!)} />}
          {outcome.promoCode && <PromoCode code={outcome.promoCode} />}
        </>
      )}

      {outcome.kind === "coupon" && (
        <>
          <Body>
            {outcome.method === "instore_print" ? "Your printable coupon is ready" : "Your in-store coupon is ready"}
            {outcome.locationLabel ? ` for ${outcome.locationLabel}` : ""}.
          </Body>
          <Caption>Show the coupon at checkout to redeem your offer.</Caption>
          {outcome.url ? (
            <Button label={outcome.method === "instore_print" ? "View Printable Coupon" : "Show Coupon"} variant="tertiary" onPress={() => WebBrowser.openBrowserAsync(outcome.url!)} />
          ) : (
            <Caption tone="default">No coupon URL received from the partner.</Caption>
          )}
          {outcome.promoCode && <PromoCode code={outcome.promoCode} />}
        </>
      )}

      {outcome.kind === "call" && (
        <>
          <Body>{outcome.message ?? "Call to redeem this offer"}</Body>
          {outcome.phone ? (
            <Button label={`Call ${outcome.phone}`} variant="accent" onPress={() => Linking.openURL(`tel:${outcome.phone!.replace(/[^\d+]/g, "")}`)} />
          ) : (
            <Caption tone="default">No phone number provided.</Caption>
          )}
          {outcome.promoCode && <PromoCode code={outcome.promoCode} />}
        </>
      )}

      <Button label="Done" variant="ghost" size="sm" onPress={onDismiss} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  successCard: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  errorCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  promo: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.citrine, padding: 12 },
  promoCode: { fontFamily: "Menlo", fontSize: 18, fontWeight: "700", color: colors.blackberry, letterSpacing: 1 },
  copy: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.white },
  copyText: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.blackberry },
  instructions: { fontSize: 15 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, textDecorationLine: "underline", flex: 1 },
});
