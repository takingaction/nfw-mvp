import { type ReactNode } from "react";
import { KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Heading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";

type Props = {
  visible: boolean;
  title?: string;
  children: ReactNode;
  /** Tapping the backdrop closes the modal (ignored when `dismissable` is false). */
  onRequestClose?: () => void;
  dismissable?: boolean;
  /** Footer row (buttons) rendered outside the scroll area. */
  footer?: ReactNode;
};

/** Centred card modal on a blackberry scrim. Web: the fixed-overlay modals in GrantApplicationForm. */
export function BrandModal({ visible, title, children, onRequestClose, dismissable = true, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onRequestClose : undefined}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Pressable style={styles.scrim} onPress={dismissable ? onRequestClose : undefined} accessibilityRole="none">
          <Pressable style={[styles.card, { marginTop: insets.top + 24, marginBottom: insets.bottom + 24 }]} onPress={() => {}}>
            {title ? <Heading style={styles.title}>{title}</Heading> : null}
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { flex: 1, backgroundColor: "rgba(46,31,56,0.55)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.white, maxHeight: "100%", borderWidth: 1, borderColor: theme.border },
  title: { fontSize: 22, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  footer: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.border },
});
