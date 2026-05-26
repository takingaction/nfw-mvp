import type { EmailSection, EmailSpacerContent } from "./types";
import { getEmailBgColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

export function EmailSpacerBlock({ section }: Props): string {
  const content = section.content as unknown as EmailSpacerContent;
  const { height = 20 } = content;
  const bgColor = getEmailBgColor(section.background_color);

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: ${height}px 40px;">
  </td>
</tr>
  `.trim();
}