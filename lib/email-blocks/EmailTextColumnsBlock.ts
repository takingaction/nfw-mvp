import { getEmailBgColor, getEmailTextColor } from "./email-colors";
import { parseInlineFormatting, parseParagraphs } from "./formatting";
import type { EmailBackgroundColor } from "./types";

interface Props {
  text: string;
  bullet_items?: string[];
  text_align?: "left" | "center" | "right";
  font_family?: "DM Sans" | "Playfair Display";
  font_size?: number;
  background_color?: EmailBackgroundColor;
}

const fontFamilyMap: Record<string, string> = {
  "DM Sans": "'DM Sans', Arial, sans-serif",
  "Playfair Display": "Georgia, 'Times New Roman', serif",
};

export function EmailTextColumnsBlock({
  text,
  bullet_items,
  text_align = "left",
  font_family = "DM Sans",
  font_size = 16,
  background_color,
}: Props): string {
  const bgColor = getEmailBgColor(background_color);
  const textColor = getEmailTextColor(background_color);
  const fontFamilyValue = fontFamilyMap[font_family] || fontFamilyMap["DM Sans"];

  const lineHeight = font_family === "Playfair Display" ? 1.3 : 1.6;

  const paragraphs = parseParagraphs(text);

  const paragraphsHtml = paragraphs
    .map((p) => {
      const formatted = parseInlineFormatting(p);
      return `<p style="margin: 0 0 16px 0; color: ${textColor}; font-family: ${fontFamilyValue}; font-size: ${font_size}px; line-height: ${lineHeight}; text-align: ${text_align};">${formatted}</p>`;
    })
    .join("");

  const bulletsHtml =
    bullet_items && bullet_items.length > 0
      ? `
    <ul style="margin: 0; padding-left: 10px; list-style-type: disc;">
      ${bullet_items
        .map(
          (item) => `
        <li style="color: ${textColor}; margin-bottom: 8px; font-family: ${fontFamilyValue}; font-size: ${font_size}px; line-height: ${lineHeight}; text-align: ${text_align};">
          <span style="color: ${textColor};">${parseInlineFormatting(item)}</span>
        </li>
      `
        )
        .join("")}
    </ul>
    `
      : "";

  return `
<div style="padding: 0;">
  ${paragraphsHtml}
  ${bulletsHtml}
</div>
  `.trim();
}