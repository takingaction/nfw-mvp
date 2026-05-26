import type { EmailSection, EmailSingleImageTextContent } from "./types";
import { getEmailBgColor } from "./email-colors";
import { EmailTextColumnsBlock } from "./EmailTextColumnsBlock";

interface Props {
  section: EmailSection;
}

export function EmailSingleImageTextBlock({ section }: Props): string {
  const content = section.content as unknown as EmailSingleImageTextContent;
  const {
    image_url,
    alt_text = "",
    text = "",
    bullet_items,
    text_align = "left",
    font_family = "DM Sans",
    font_size = 16,
  } = content;

  const bgColor = getEmailBgColor(section.background_color);

  if (!image_url && !text) {
    return "";
  }

  const textContent = EmailTextColumnsBlock({
    text,
    bullet_items,
    text_align,
    font_family,
    font_size,
    background_color: section.background_color,
  });

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 0 40px 8px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${image_url ? `
        <td width="33%" style="vertical-align: top; padding-right: 20px;">
          <div style="width: 100%; height: 190px; overflow: hidden;">
            <img src="${image_url}" alt="${alt_text}" width="100%" height="100%" style="display: block; object-fit: cover;" />
          </div>
        </td>
        ` : ""}
        <td width="67%" style="vertical-align: top; padding: 0;">
          ${textContent}
        </td>
      </tr>
    </table>
  </td>
</tr>
  `.trim();
}