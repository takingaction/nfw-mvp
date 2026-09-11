import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import { colors } from "@/constants/colors";
import { useLikedStores } from "@/stores/likedStores";

type Props = {
  storeKey: string | number;
  storeName: string;
  logoUrl?: string | null;
  size?: number;
  /** Render on dark surfaces */
  onDark?: boolean;
};

/**
 * Heart toggle — web: StoreCard / OfferDetailPanel "Save".
 * Unliked: citrine outline · Liked: lilac fill · 300 ms scale pop on toggle.
 */
export function LikeButton({ storeKey, storeName, logoUrl, size = 22, onDark }: Props) {
  const liked = useLikedStores((s) => s.keys.has(String(storeKey)));
  const toggle = useLikedStores((s) => s.toggle);
  const [scale] = useState(() => new Animated.Value(1));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [liked, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? "Remove from saved brands" : "Save brand"}
      accessibilityState={{ selected: liked }}
      hitSlop={10}
      onPress={(e) => {
        e.stopPropagation();
        void toggle({ store_key: storeKey, store_name: storeName, logo_url: logoUrl });
      }}
      style={styles.button}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={size}
          color={liked ? colors.lilac : onDark ? colors.citrine : colors.citrine}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 4 },
});
