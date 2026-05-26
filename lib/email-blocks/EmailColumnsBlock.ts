import type { EmailSection, EmailColumnsContent } from "./types";
import { getEmailBgColor, getEmailTextColor } from "./email-colors";

interface Props {
  section: EmailSection;
}

export function EmailColumnsBlock({ section }: Props): string {
  const content = section.content as unknown as EmailColumnsContent;
  const { columns = [], column_gap = 20, text_align = "left" } = content;

  if (columns.length === 0) {
    return "";
  }

  const bgColor = getEmailBgColor(section.background_color);
  const textColor = getEmailTextColor(section.background_color);
  const colCount = columns.length;
  const colWidth = Math.floor(600 / colCount) - column_gap;

  const colCells = columns
    .map((col, i) => {
      const width = col.width || colWidth;
      return `
        <td width="${width}" style="vertical-align: top; padding-right: ${i < columns.length - 1 ? column_gap : 0}px;">
          <div style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: ${textColor}; text-align: ${text_align};">
            ${col.content}
          </div>
        </td>
      `.trim();
    })
    .join("");

  return `
<tr style="background-color: ${bgColor};">
  <td style="padding: 8px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${colCells}
      </tr>
    </table>
  </td>
</tr>
  `.trim();
}