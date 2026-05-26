import type { EmailSection, EmailSocialContent } from "./types";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png",
  tiktok: "https://img.icons8.com/ios-filled/50/ffffff/tiktok--v1.png",
  facebook: "https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png",
};

export function EmailSocialBlock({ section }: Props): string {
  const content = section.content as unknown as EmailSocialContent;
  const { platforms = [], urls = [] } = content;
  if (platforms.length === 0) {
    return "";
  }

  const bgColor = getEmailBgColor(section.background_color);

  const icons = platforms
    .map((platform, index) => {
      const iconUrl = SOCIAL_ICONS[platform];
      const linkUrl = urls[index] || "#";
      if (!iconUrl) return "";
      return `
      <a href="${linkUrl}" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="${iconUrl}" alt="${platform}" width="28" height="28" style="display: block; width: 28px; height: 28px;" />
      </a>
    `.trim();
    })
    .join("");

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px; text-align: center;">
    <span style="display: inline-block;">
      ${icons}
    </span>
  </td>
</tr>
  `.trim();
}