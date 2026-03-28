import { BackgroundColor, CardSwatchColor } from "./sections/types";

const BACKGROUND_CLASSES: Record<BackgroundColor, string> = {
  dove: "bg-nfw-dove",
  aubergine: "bg-nfw-aubergine",
  wisteria: "bg-nfw-wisteria",
  blackberry: "bg-nfw-blackberry",
};

export function getBackgroundClass(background?: BackgroundColor): string {
  if (!background) return "";
  return BACKGROUND_CLASSES[background] || "";
}

export function getTextColorForBackground(background?: BackgroundColor): string {
  if (!background) return "text-nfw-aubergine";
  
  switch (background) {
    case "dove":
      return "text-nfw-aubergine";
    case "aubergine":
    case "wisteria":
    case "blackberry":
      return "text-white";
    default:
      return "text-nfw-aubergine";
  }
}

export function getMutedTextColorForBackground(background?: BackgroundColor): string {
  if (!background) return "text-nfw-blackberry/70";
  
  switch (background) {
    case "dove":
      return "text-nfw-blackberry/70";
    case "aubergine":
    case "wisteria":
    case "blackberry":
      return "text-white/80";
    default:
      return "text-nfw-blackberry/70";
  }
}

export function getEyebrowColorForBackground(background?: BackgroundColor): string {
  if (!background) return "text-nfw-blackberry/40";
  
  switch (background) {
    case "dove":
      return "text-nfw-blackberry/40";
    case "aubergine":
    case "wisteria":
    case "blackberry":
      return "text-nfw-dove";
    default:
      return "text-nfw-blackberry/40";
  }
}

export function getPrimaryButtonClass(background?: BackgroundColor): string {
  if (!background) {
    return "bg-nfw-citrine text-nfw-blackberry";
  }
  
  switch (background) {
    case "dove":
      return "bg-nfw-citrine text-nfw-blackberry";
    case "aubergine":
    case "wisteria":
    case "blackberry":
      return "bg-nfw-citrine text-nfw-blackberry";
    default:
      return "bg-nfw-citrine text-nfw-blackberry";
  }
}

const CARD_COLOR_MAP: Record<CardSwatchColor, string> = {
  yellow: "#fdf493",
  green: "#d4f1ad",
  blue: "#b2d1ee",
  lavender: "#bcafcf",
  citrine: "#e8d5a3",
  lilac: "#c9b8d9",
  powder: "#b8c5d6",
  dark_purple: "#3e155f",
  medium_lavender: "#b693c0",
  soft_blue: "#7786be",
};

export function getCardSwatchColor(color: CardSwatchColor): string {
  return CARD_COLOR_MAP[color] || color;
}

export function getCardSwatchBgClass(color: CardSwatchColor): string {
  switch (color) {
    case "yellow":
      return "bg-yellow-100";
    case "green":
      return "bg-green-100";
    case "blue":
      return "bg-blue-100";
    case "lavender":
      return "bg-purple-100";
    case "citrine":
      return "bg-nfw-citrine/20";
    case "lilac":
      return "bg-nfw-lilac/20";
    case "powder":
      return "bg-nfw-powder/20";
    case "dark_purple":
      return "bg-[#3e155f]";
    case "medium_lavender":
      return "bg-[#b693c0]";
    case "soft_blue":
      return "bg-[#7786be]";
    default:
      return "bg-nfw-blackberry/5";
  }
}

export function getLogoFilterClass(background?: BackgroundColor): string {
  if (!background || background === "dove") {
    return "";
  }
  return "brightness-0 invert";
}

export function getCardTextColorForBackground(background?: BackgroundColor): string {
  if (!background || background === "dove") {
    return "text-nfw-blackberry";
  }
  return "text-white";
}

export function getCardBorderColorForBackground(background?: BackgroundColor): string {
  if (!background || background === "dove") {
    return "border-nfw-blackberry/10";
  }
  return "border-white/20";
}
