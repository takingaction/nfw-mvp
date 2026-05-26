import type { EmailSection, EmailTextContent } from "./types";
import { getEmailBgColor, getEmailTextColor } from "./email-colors";
import { parseInlineFormatting, parseParagraphs } from "./formatting";

interface Props {
  section: EmailSection;
}

const fontFamilyMap: Record<string, string> = {
  "DM Sans": "'DM Sans', Arial, sans-serif",
  "Playfair Display": "Georgia, 'Times New Roman', serif",
};

export function EmailTextBlock({ section }: Props): string {
  const content = section.content as unknown as EmailTextContent;
  const { text, text_align = "left", font_family, font_size = 16, bullet_items } = content;

  const fontFamilyValue = fontFamilyMap[font_family || "DM Sans"];
  const bgColor = getEmailBgColor(section.background_color);
  const textColor = getEmailTextColor(section.background_color);
  const lineHeight = font_family === "Playfair Display" ? 1.3 : 1.6;

  const paragraphs = parseParagraphs(text || "");

  const paragraphsHtml = paragraphs
    .map((p) => {
      const formatted = parseInlineFormatting(p);
      return `<p style="margin: 0 0 16px 0; font-family: ${fontFamilyValue}; font-size: ${font_size}px; line-height: ${lineHeight}; color: ${textColor}; text-align: ${text_align};">${formatted}</p>`;
    })
    .join("");

  const bulletsHtml =
    bullet_items && bullet_items.length > 0
      ? `
    <ul style="margin: 0; padding: 0; list-style-type: none;">
      ${bullet_items
        .map(
          (item) => `
        <li style="color: ${textColor}; font-family: ${fontFamilyValue}; font-size: ${font_size}px; line-height: ${lineHeight}; padding: 0 0 8px 0; padding-left: 20px; position: relative; text-align: ${text_align};">
          <span style="position: absolute; left: 0; font-size: 16px;">•</span>
          ${parseInlineFormatting(item)}
        </li>
      `
        )
        .join("")}
    </ul>
    `
      : "";

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px;">
    <div>
      ${paragraphsHtml}
      ${bulletsHtml}
    </div>
  </td>
</tr>
  `.trim();
}