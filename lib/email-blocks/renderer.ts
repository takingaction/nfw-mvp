import type {
  EmailHeroContent,
  EmailTextContent,
  EmailImageContent,
  EmailCtaContent,
  EmailDividerContent,
  EmailSpacerContent,
  EmailSocialContent,
  EmailColumnsContent,
  EmailVariableContent,
  EmailSection,
  EmailBlockType,
} from "./types";

import { EMAIL_BLOCK_REGISTRY } from "./registry";
import { EmailHeroBlock } from "./EmailHeroBlock";
import { EmailTextBlock } from "./EmailTextBlock";
import { EmailImageBlock } from "./EmailImageBlock";
import { EmailCtaBlock } from "./EmailCtaBlock";
import { EmailDividerBlock } from "./EmailDividerBlock";
import { EmailSpacerBlock } from "./EmailSpacerBlock";
import { EmailSocialBlock } from "./EmailSocialBlock";
import { EmailColumnsBlock } from "./EmailColumnsBlock";
import { EmailVariableBlock } from "./EmailVariableBlock";
import { EmailDoubleImageCtaBlock } from "./EmailDoubleImageCtaBlock";
import { EmailSingleImageCtaBlock } from "./EmailSingleImageCtaBlock";
import { EmailSingleImageTextBlock } from "./EmailSingleImageTextBlock";
import { EmailDoubleImageTextBlock } from "./EmailDoubleImageTextBlock";

interface Props {
  section: EmailSection;
}

export function renderEmailBlock(section: EmailSection): string {
  const { section_type, content, background_color } = section;

  switch (section_type) {
    case "email_hero":
      return EmailHeroBlock({ section });
    case "email_text":
      return EmailTextBlock({ section });
    case "email_image":
      return EmailImageBlock({ section });
    case "email_cta":
      return EmailCtaBlock({ section });
    case "email_divider":
      return EmailDividerBlock({ section });
    case "email_spacer":
      return EmailSpacerBlock({ section });
    case "email_social":
      return EmailSocialBlock({ section });
    case "email_columns":
      return EmailColumnsBlock({ section });
    case "email_variable":
      return EmailVariableBlock({ section });
    case "email_double_image_cta":
      return EmailDoubleImageCtaBlock({ section });
    case "email_single_image_cta":
      return EmailSingleImageCtaBlock({ section });
    case "email_single_image_text_columns":
      return EmailSingleImageTextBlock({ section });
    case "email_double_image_text_columns":
      return EmailDoubleImageTextBlock({ section });
    default:
      return "";
  }
}

export function renderAllBlocks(sections: EmailSection[]): string {
  const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);
  return sorted.map(renderEmailBlock).join("\n");
}

export { EmailHeroBlock } from "./EmailHeroBlock";
export { EmailTextBlock } from "./EmailTextBlock";
export { EmailImageBlock } from "./EmailImageBlock";
export { EmailCtaBlock } from "./EmailCtaBlock";
export { EmailDividerBlock } from "./EmailDividerBlock";
export { EmailSpacerBlock } from "./EmailSpacerBlock";
export { EmailSocialBlock } from "./EmailSocialBlock";
export { EmailColumnsBlock } from "./EmailColumnsBlock";
export { EmailVariableBlock } from "./EmailVariableBlock";
export { EmailDoubleImageCtaBlock } from "./EmailDoubleImageCtaBlock";
export { EmailSingleImageCtaBlock } from "./EmailSingleImageCtaBlock";
export { EmailSingleImageTextBlock } from "./EmailSingleImageTextBlock";
export { EmailDoubleImageTextBlock } from "./EmailDoubleImageTextBlock";