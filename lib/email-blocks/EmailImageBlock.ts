import type { EmailSection, EmailImageContent } from "./types";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

export function EmailImageBlock({ section }: Props): string {
  const content = section.content as unknown as EmailImageContent;
  const { image_url, alt_text = "", link_url, width = "full" } = content;

  const widthMap = {
    full: "600",
    large: "480",
    medium: "360",
    small: "240",
  };
  const imgWidth = widthMap[width as keyof typeof widthMap] || "600";
  const bgColor = getEmailBgColor(section.background_color);

  const imageHtml = `
    <img src="${image_url}" alt="${alt_text}" width="${imgWidth}" style="display: block; max-width: 100%; height: auto;" />
  `.trim();

  if (link_url) {
    return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px; text-align: center;">
    <a href="${link_url}" target="_blank" style="text-decoration: none;">
      ${imageHtml}
    </a>
  </td>
</tr>
    `.trim();
  }

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px; text-align: center;">
    ${imageHtml}
  </td>
</tr>
  `.trim();
}