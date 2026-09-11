import { Image } from "expo-image";
import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Body, Heading } from "@/components/ui/Typography";
import { theme } from "@/constants/colors";

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Hide the brand mark (e.g. inner sign-up steps that show a progress bar instead). */
  hideLogo?: boolean;
  header?: ReactNode;
};

/** Shared layout for auth screens: logo, heading, form, keyboard-safe scroll. */
export function AuthShell({ title, subtitle, children, hideLogo, header }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, { paddingTop: hideLogo ? 16 : insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!hideLogo && (
          <Image source={require("@/assets/brand/nfw-symbol-brandmark-aubergine.png")} style={styles.logo} contentFit="contain" accessibilityLabel="National Fund for Women" />
        )}
        {header}
        <View style={styles.header}>
          <Heading accessibilityRole="header">{title}</Heading>
          {subtitle ? typeof subtitle === "string" ? <Body tone="muted">{subtitle}</Body> : subtitle : null}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 24, gap: 20 },
  logo: { width: 180, height: 62, alignSelf: "center" },
  header: { gap: 6 },
});
