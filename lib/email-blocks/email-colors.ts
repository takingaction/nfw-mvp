import type { EmailBackgroundColor } from "./types";

export const EMAIL_BG_COLORS: Record<EmailBackgroundColor, string> = {
  dove: "#F6F5F0",
  aubergine: "#3E145F",
  wisteria: "#7786BE",
  lilac: "#B693C0",
  blackberry: "#2E1F38",
};

export const EMAIL_TEXT_COLORS: Record<EmailBackgroundColor, string> = {
  dove: "#3E145F",
  aubergine: "#FFFFFF",
  wisteria: "#FFFFFF",
  lilac: "#FFFFFF",
  blackberry: "#FFFFFF",
};

export function getEmailBgColor(color?: EmailBackgroundColor): string {
  if (!color) return "transparent";
  return EMAIL_BG_COLORS[color] || "transparent";
}

export function getEmailTextColor(color?: EmailBackgroundColor): string {
  if (!color) return "#3E145F";
  return EMAIL_TEXT_COLORS[color] || "#3E145F";
}