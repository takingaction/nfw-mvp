import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_900Black,
} from "@expo-google-fonts/dm-sans";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";

/**
 * Brand font rules (from AGENTS.md):
 *  - Playfair Display (`font-serif` on web): headings, body text, descriptions
 *  - DM Sans (`font-ui` on web): buttons, nav, eyebrows, labels
 *
 * Loaded once in app/_layout.tsx via expo-font's useFonts(fontAssets).
 */
export const fontAssets = {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_900Black,
};

export const fonts = {
  serif: "PlayfairDisplay_400Regular",
  serifItalic: "PlayfairDisplay_400Regular_Italic",
  serifSemiBold: "PlayfairDisplay_600SemiBold",
  serifBold: "PlayfairDisplay_700Bold",
  ui: "DMSans_400Regular",
  uiMedium: "DMSans_500Medium",
  uiBold: "DMSans_700Bold",
  uiBlack: "DMSans_900Black",
} as const;

export type BrandFont = keyof typeof fonts;
