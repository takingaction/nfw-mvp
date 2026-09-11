import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import type { ClaimEligibility } from "@/lib/api/store";
import { decodeEntities } from "@/lib/html";
import type { StoreProduct } from "@/types/store";

type Props = {
  product: StoreProduct;
  eligibility: ClaimEligibility;
  onClaim: () => void;
  onMoreInfo: () => void;
};

/**
 * Web: product card in components/StoreClient.tsx — 3:4 image (grayscale when out of
 * stock / DRAFT), "Out of Stock" / "Dropping Soon" badges, variant titles pill,
 * uppercase title, "Value: $X.XX", cardDescription, Claim Item + More Info.
 */
export function ProductCard({ product, eligibility, onClaim, onMoreInfo }: Props) {
  const dimmed = !product.availableForSale || product.status === "DRAFT";
  const variantPill = product.variants.length > 0 && product.variants[0].title !== "Default" ? product.variants.map((v) => v.title).join(", ") : null;

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={[styles.image, dimmed && styles.dimmed]} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        <View style={styles.badgesTop}>
          {!product.availableForSale && <Badge label="Out of Stock" tone="aubergine" />}
          {product.status === "DRAFT" && <Badge label="Dropping Soon" tone="wisteria" />}
        </View>
        {variantPill ? (
          <View style={styles.badgesBottom}>
            <Badge label={variantPill} tone="wisteria" />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        {product.compareAtPrice && product.compareAtPrice > 0 ? <Caption>Value: ${product.compareAtPrice.toFixed(2)}</Caption> : null}
        {product.cardDescription ? (
          <Caption numberOfLines={3} style={styles.description}>
            {decodeEntities(product.cardDescription)}
          </Caption>
        ) : null}
        <View style={styles.buttons}>
          <Button
            label={eligibility.eligible ? "Claim Item" : eligibility.reason}
            variant="accent"
            size="sm"
            disabled={!eligibility.eligible}
            onPress={onClaim}
            style={styles.button}
          />
          <Button label="More Info" variant="secondary" size="sm" onPress={onMoreInfo} style={styles.button} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  imageWrap: { position: "relative" },
  image: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "rgba(163,163,163,0.1)" },
  dimmed: { opacity: 0.6 },
  placeholder: { backgroundColor: colors.dove },
  badgesTop: { position: "absolute", top: 10, left: 10, gap: 6 },
  badgesBottom: { position: "absolute", bottom: 10, left: 10 },
  body: { padding: 14, gap: 6 },
  title: { fontFamily: fonts.uiBlack, fontSize: 12, letterSpacing: 0.72, textTransform: "uppercase", color: theme.text },
  description: { color: theme.textMuted },
  buttons: { flexDirection: "row", gap: 8, marginTop: 6 },
  button: { flex: 1, paddingHorizontal: 6 },
});
