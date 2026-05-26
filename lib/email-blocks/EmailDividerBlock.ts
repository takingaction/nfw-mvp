import type { EmailSection, EmailDividerContent } from "./types";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

export function EmailDividerBlock({ section }: Props): string {
  const content = section.content as unknown as EmailDividerContent;
  const { color = "#B693C0", thickness = 1, width = "full" } = content;
  const widthMap = {
    full: "100%",
    large: "80%",
    medium: "60%",
    small: "40%",
  };
  const divWidth = widthMap[width as keyof typeof widthMap] || "100%";
  const bgColor = getEmailBgColor(section.background_color);

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px;">
    <hr style="border: none; border-top: ${thickness}px solid ${color}; width: ${divWidth}; margin: 0 auto;" />
  </td>
</tr>
  `.trim();
}