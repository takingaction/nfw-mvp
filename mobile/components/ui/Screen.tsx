import { type ReactNode } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Body, Subheading } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { colors, theme } from "@/constants/colors";

type Props = ScrollViewProps & {
  children: ReactNode;
  /** Pull-to-refresh handler */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Add horizontal padding (default true). Set false for full-bleed sections. */
  padded?: boolean;
  /** Extra bottom padding for tab bar etc. */
  bottomInset?: boolean;
};

/** Standard scrolling screen container with brand background + pull-to-refresh. */
export function Screen({ children, onRefresh, refreshing = false, padded = true, bottomInset = true, contentContainerStyle, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: (bottomInset ? insets.bottom : 0) + 24 },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aubergine} /> : undefined
      }
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.aubergine} />
      {message && <Body tone="muted">{message}</Body>}
    </View>
  );
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Subheading style={{ textAlign: "center" }}>Something went wrong</Subheading>
      <Body tone="muted" style={{ textAlign: "center" }}>
        {message}
      </Body>
      {onRetry && <Button label="Try again" variant="ghost" size="sm" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  padded: { paddingHorizontal: 20, paddingTop: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: theme.background },
});
