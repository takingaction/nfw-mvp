import type { EmailSection, EmailDoubleImageCtaContent, ButtonColor } from "./types";
import { getButtonStyles } from "./utils";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

export function EmailDoubleImageCtaBlock({ section }: Props): string {
  const content = section.content as unknown as EmailDoubleImageCtaContent;
  const {
    image1_url,
    alt1_text = "",
    button1_text,
    button1_url,
    button1_color = "citrine",
    image2_url,
    alt2_text = "",
    button2_text,
    button2_url,
    button2_color = "citrine",
  } = content;

  const bgColor = getEmailBgColor(section.background_color);
  const { bg: bg1, text: text1 } = getButtonStyles(button1_color as ButtonColor);
  const { bg: bg2, text: text2 } = getButtonStyles(button2_color as ButtonColor);

  if (!image1_url && !image2_url) {
    return "";
  }

  const renderButton = (text: string, url: string, textColor: string) => {
    if (!text) return "";
    const inner = `
    <div style="text-align: center; color: ${textColor}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px 24px;">
      ${text}
    </div>`;

    if (url) {
      return `<a href="${url}" target="_blank" style="display: block; text-decoration: none;">${inner}</a>`;
    }
    return inner;
  };

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${image1_url ? `
        <td width="50%" style="vertical-align: top; padding-right: 10px;">
          <div style="width: 100%; height: 200px; overflow: hidden;">
            <img src="${image1_url}" alt="${alt1_text}" width="100%" height="100%" style="display: block; object-fit: cover;" />
          </div>
        </td>
        ` : ""}
        ${image2_url ? `
        <td width="50%" style="vertical-align: top; padding-left: 10px;">
          <div style="width: 100%; height: 200px; overflow: hidden;">
            <img src="${image2_url}" alt="${alt2_text}" width="100%" height="100%" style="display: block; object-fit: cover;" />
          </div>
        </td>
        ` : ""}
      </tr>
      <tr>
        ${image1_url ? `
        <td width="50%" style="vertical-align: top; padding: 10px 10px 0 0;">
          <div style="background-color: ${bg1};">
            ${button1_text ? renderButton(button1_text, button1_url, text1) : ""}
          </div>
        </td>
        ` : ""}
        ${image2_url ? `
        <td width="50%" style="vertical-align: top; padding: 10px 0 0 10px;">
          <div style="background-color: ${bg2};">
            ${button2_text ? renderButton(button2_text, button2_url, text2) : ""}
          </div>
        </td>
        ` : ""}
      </tr>
    </table>
  </td>
</tr>
  `.trim();
}