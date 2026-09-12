import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Eyebrow, Heading, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useFaqContent } from "@/lib/api/content";
import { env } from "@/lib/env";
import { splitMarkdownLinks } from "@/lib/html";
import { mapWebPathToAppRoute } from "@/lib/notifications";
import type { FaqQuestion } from "@/types/content";

/**
 * Web equivalent: app/faq/page.tsx + components/faq/FaqClient.tsx + GET /api/faq
 * Build phase: 6
 *
 * Same structure as web: hero → per-category accordion (each item toggles independently)
 * → "Still have questions?" CTA row. Markdown links inside answers are tappable.
 */

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Marketing pages with no native screen → system browser. */
const WEB_ONLY_PREFIXES = ["/pricing", "/plans", "/perks/info", "/microgrants", "/gift-membership", "/about", "/articles", "/auth/sign-up"];

export default function FaqScreen() {
  const router = useRouter();
  const faq = useFaqContent();
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openLink(url: string) {
    const isWebOnly = url.startsWith("http") || url.startsWith("mailto:") || WEB_ONLY_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`));
    const route = isWebOnly ? url : mapWebPathToAppRoute(url);
    if (!isWebOnly && route !== url) router.push(route as Href);
    else if (url.startsWith("mailto:")) void Linking.openURL(url);
    else void WebBrowser.openBrowserAsync(url.startsWith("http") ? url : `${env.siteUrl}${url}`);
  }

  if (faq.isPending) return <LoadingScreen />;
  if (faq.isError) return <ErrorScreen message="Couldn't load the FAQ." onRetry={() => faq.refetch()} />;

  const data = faq.data;
  const sections = data?.faq_sections ?? [];

  return (
    <Screen padded={false} onRefresh={() => faq.refetch()} refreshing={faq.isRefetching}>
      <View style={styles.hero}>
        <Eyebrow tone="accent">{data?.hero_eyebrow ?? "We've got answers"}</Eyebrow>
        <Heading tone="inverse" style={{ marginTop: 4 }}>{data?.hero_headline ?? "Frequently Asked Questions"}</Heading>
        {data?.hero_subheadline ? <Body tone="inverseMuted">{data.hero_subheadline}</Body> : null}
      </View>

      <View style={styles.content}>
        {sections.length === 0 ? (
          <EmptyState icon="help-circle-outline" title="No questions yet" message="Check back soon." />
        ) : (
          sections.map((section, si) => (
            <View key={`${section.category}-${si}`} style={styles.section}>
              <Eyebrow>{section.category}</Eyebrow>
              <View style={styles.list}>
                {section.questions.map((q, qi) => (
                  <FaqItem key={`${si}-${qi}`} item={q} open={open.has(`${si}-${qi}`)} onToggle={() => toggle(`${si}-${qi}`)} onLink={openLink} last={qi === section.questions.length - 1} />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.cta}>
          <Subheading tone="inverse" style={styles.center}>{data?.still_have_questions_heading ?? "Still have questions?"}</Subheading>
          <Body tone="inverseMuted" style={styles.center}>
            {data?.still_have_questions_subheading ?? "We're here to help. Reach out and a real person will get back to you."}
          </Body>
          <View style={styles.ctaButtons}>
            {(data?.still_have_questions_buttons?.length ? data.still_have_questions_buttons : [{ label: "Contact Us", url: "/contact", style: "solid" as const, open_in_new_tab: false }]).map((b) => (
              <Button key={b.label} label={b.label} variant={b.style === "ghost" ? "secondary" : "accent"} onPress={() => openLink(b.url)} fullWidth />
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

function FaqItem({ item, open, onToggle, onLink, last }: { item: FaqQuestion; open: boolean; onToggle: () => void; onLink: (url: string) => void; last: boolean }) {
  const segments = splitMarkdownLinks(item.answer);
  return (
    <View style={[styles.item, last && styles.itemLast]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.itemHeader} hitSlop={4}>
        <Text style={styles.question}>{item.question}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.text} />
      </Pressable>
      {open && (
        <Text style={styles.answer}>
          {segments.map((s, i) =>
            s.type === "link" ? (
              <Text key={i} style={styles.answerLink} onPress={() => onLink(s.href)} accessibilityRole="link">
                {s.text}
              </Text>
            ) : (
              <Text key={i}>{s.text}</Text>
            ),
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.aubergine, paddingHorizontal: 20, paddingVertical: 28, gap: 8 },
  content: { padding: 20, gap: 28 },
  section: { gap: 10 },
  list: { backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16 },
  item: { borderBottomWidth: 1, borderBottomColor: "rgba(46,31,56,0.1)", paddingVertical: 14, gap: 10 },
  itemLast: { borderBottomWidth: 0 },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  question: { flex: 1, fontFamily: fonts.serifSemiBold, fontSize: 16, lineHeight: 22, color: theme.text },
  answer: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, color: theme.textMuted, paddingBottom: 4 },
  answerLink: { color: colors.aubergine, textDecorationLine: "underline", fontFamily: fonts.serifSemiBold },
  cta: { backgroundColor: colors.aubergine, padding: 24, gap: 10 },
  ctaButtons: { gap: 10, marginTop: 8 },
  center: { textAlign: "center" },
});
