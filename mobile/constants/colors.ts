/**
 * NFW brand palette — mirrors the Tailwind `nfw-*` tokens in the web app.
 * Green is intentionally excluded from the brand set; it is reserved for
 * status badges only (approved / paid / success).
 */
export const colors = {
  aubergine: "#3E145F",
  citrine: "#F8F19A",
  lilac: "#B693C0",
  wisteria: "#7786BE",
  dove: "#F6F5F0",
  blackberry: "#2E1F38",
  stone: "#a3a3a3",
  white: "#FFFFFF",

  // Status-only (do not use for general UI)
  statusGreen: "#d4f1ad",
  statusRed: "#EF4444",
  statusYellow: "#FDE68A",
} as const;

export type BrandColor = keyof typeof colors;

/** Semantic aliases used across screens */
export const theme = {
  background: colors.dove,
  surface: colors.white,
  text: colors.blackberry,
  textMuted: "rgba(46, 31, 56, 0.6)",
  primary: colors.aubergine,
  primaryText: colors.white,
  accent: colors.citrine,
  accentText: colors.blackberry,
  secondary: colors.wisteria,
  tertiary: colors.lilac,
  border: "rgba(46, 31, 56, 0.1)",
  tabBarActive: colors.aubergine,
  tabBarInactive: colors.stone,
} as const;
