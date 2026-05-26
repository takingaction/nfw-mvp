import type { EmailSection, ButtonColor } from "./types";
import { getButtonStyles } from "./utils";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

interface CtaContent {
  button_text: string;
  button_url: string;
  button_color?: ButtonColor;
  text_align?: "left" | "center" | "right";
}

export function EmailCtaBlock({ section }: Props): string {
  const content = section.content as unknown as CtaContent;
  const { button_text, button_url, button_color = "citrine", text_align = "center" } = content;
  const { bg, text } = getButtonStyles(button_color);
  const bgColor = getEmailBgColor(section.background_color);

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px; text-align: ${text_align};">
    <table cellpadding="0" cellspacing="0" border="0" style="margin-left: ${text_align === "center" ? "auto" : text_align === "right" ? "auto" : "0"}; margin-right: ${text_align === "center" ? "auto" : "0"};">
      <tr>
        <td>
          <a href="${button_url}" target="_blank" style="display: inline-block; background-color: ${bg}; color: ${text}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px;">
            ${button_text}
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>
  `.trim();
}