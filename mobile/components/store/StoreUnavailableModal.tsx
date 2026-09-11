import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { BrandModal } from "@/components/ui/Modal";
import { Body, Heading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

/**
 * Web: components/ui/ShopifyUnavailableModal.tsx — non-dismissable; copy verbatim.
 * Shown when system_settings.shopify_checkout_enabled === false or checkout returns 503.
 * "Visit Homepage" → dashboard on mobile.
 */
export function StoreUnavailableModal({ visible }: { visible: boolean }) {
  const router = useRouter();
  return (
    <BrandModal visible={visible} dismissable={false} footer={<Button label="Visit Homepage" variant="primary" onPress={() => router.replace("/(tabs)/dashboard")} style={{ flex: 1 }} />}>
      <View style={styles.wrap}>
        <View style={styles.icon}>
          <Ionicons name="warning" size={30} color={colors.blackberry} />
        </View>
        <Heading style={styles.center}>Store Temporarily Unavailable</Heading>
        <Body style={styles.center}>We&apos;re sorry, the Zero Dollar Store is temporarily unavailable. Please check back in a few minutes.</Body>
        <Body tone="muted" style={styles.center}>If you continue to experience issues, please contact support.</Body>
      </View>
    </BrandModal>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 12, paddingTop: 20 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(248,241,154,0.4)", alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
});
