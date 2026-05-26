import type { ButtonColorMap } from "./types";

export const BUTTON_COLORS: ButtonColorMap = {
  citrine: { bg: "#F8F19A", text: "#3E145F" },
  wisteria: { bg: "#7786BE", text: "#FFFFFF" },
  lilac: { bg: "#B693C0", text: "#FFFFFF" },
  aubergine: { bg: "#3E145F", text: "#FFFFFF" },
};

export function getButtonStyles(color: keyof ButtonColorMap): { bg: string; text: string } {
  return BUTTON_COLORS[color] || BUTTON_COLORS.citrine;
}