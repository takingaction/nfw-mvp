import type { EmailSection, EmailSingleImageCtaContent, ButtonColor } from "./types";
import { getButtonStyles } from "./utils";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

export function EmailSingleImageCtaBlock({ section }: Props): string {
  const sectionData = section.content as unknown as EmailSingleImageCtaContent;
  const {
    image_url,
    alt_text = "",
    button_text,
    button_url,
    button_color = "citrine",
  } = sectionData;

  const bgColor = getEmailBgColor(section.background_color);
  const { bg: bg1, text: text1 } = getButtonStyles(button_color as ButtonColor);

  if (!image_url) {
    return "";
  }

  const button = button_text
    ? `
    <div style="text-align: center; color: ${text1}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px 24px;">
      ${button_text}
    </div>`
    : "";

  const buttonCell = button_url
    ? `<a href="${button_url}" target="_blank" style="display: block; text-decoration: none;">${button}</a>`
    : button;

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px;">
    <div style="width: 100%; height: 200px; overflow: hidden;">
      <img src="${image_url}" alt="${alt_text}" width="100%" height="100%" style="display: block; object-fit: cover;" />
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
      <tr>
        <td style="vertical-align: top; padding: 0;">
          <div style="background-color: ${bg1};">
            ${buttonCell}
          </div>
        </td>
      </tr>
    </table>
  </td>
</tr>
  `.trim();
}