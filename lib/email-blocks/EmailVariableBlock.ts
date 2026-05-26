import type { EmailSection, EmailVariableContent } from "./types";

interface Props {
  section: EmailSection;
}

export function EmailVariableBlock({ section }: Props): string {
  const content = section.content as unknown as EmailVariableContent;
  const { variable_name, fallback_text = "" } = content;
  return `{{${variable_name}${fallback_text ? `|${fallback_text}` : ""}}}`;
}