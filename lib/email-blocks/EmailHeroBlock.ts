import type { EmailSection, EmailHeroContent } from "./types";

interface Props {
  section: EmailSection;
}

export function EmailHeroBlock({ section }: Props): string {
  const content = section.content as unknown as EmailHeroContent;
  const { image_url, hero_text, text_color = "#FFFFFF", overlay_position = "center", background_overlay = "rgba(0,0,0,0.3)" } = content;
  const paddingMap = {
    top: "80px 40px",
    center: "120px 40px",
    bottom: "80px 40px",
  };
  const padding = paddingMap[overlay_position] || paddingMap.center;

  return `
<tr>
  <td style="padding: 0; margin: 0; background-image: url('${image_url}'); background-size: cover; background-position: center; background-repeat: no-repeat; position: relative;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: ${padding}; text-align: center; vertical-align: middle; background-color: ${background_overlay};" class="hero-cell">
          <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-style: italic; font-weight: 400; color: ${text_color}; line-height: 1.4; margin: 0;">
            ${hero_text}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
  `.trim();
}