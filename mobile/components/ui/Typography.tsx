import { StyleSheet, Text, type TextProps } from "react-native";

import { theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Tone = "default" | "muted" | "inverse" | "inverseMuted" | "primary" | "accent";

const toneColor: Record<Tone, string> = {
  default: theme.text,
  muted: theme.textMuted,
  inverse: "#FFFFFF",
  inverseMuted: "rgba(255,255,255,0.75)",
  primary: theme.primary,
  accent: theme.accent,
};

type BaseProps = TextProps & { tone?: Tone };

/** Eyebrow — DM Sans 900, tracked, uppercase. Web: `text-xs font-black tracking-[0.06em] uppercase` */
export function Eyebrow({ style, tone = "primary", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.eyebrow, { color: toneColor[tone] }, style]} />;
}

/** Display heading — Playfair, large. Web: hero H1. */
export function Display({ style, tone = "default", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.display, { color: toneColor[tone] }, style]} />;
}

/** Section heading — Playfair. Web: H2. */
export function Heading({ style, tone = "default", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.heading, { color: toneColor[tone] }, style]} />;
}

/** Sub-heading — Playfair semibold. Web: H3. */
export function Subheading({ style, tone = "default", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.subheading, { color: toneColor[tone] }, style]} />;
}

/** Body copy — Playfair regular. */
export function Body({ style, tone = "default", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.body, { color: toneColor[tone] }, style]} />;
}

/** Small body / captions — Playfair. */
export function Caption({ style, tone = "muted", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.caption, { color: toneColor[tone] }, style]} />;
}

/** UI label — DM Sans 700, for buttons/labels/metadata. Web: `font-ui`. */
export function Label({ style, tone = "default", ...rest }: BaseProps) {
  return <Text {...rest} style={[styles.label, { color: toneColor[tone] }, style]} />;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.uiBlack,
    fontSize: 12,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46 },
  heading: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32 },
  subheading: { fontFamily: fonts.serifSemiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.uiBold, fontSize: 13, letterSpacing: 0.3 },
});
