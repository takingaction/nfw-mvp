import { Fragment } from "react";
import { parseGrantDescription } from "@/lib/grant-description";

/**
 * Renders a plain-text grant cycle description with paragraphs, line breaks
 * and bullet lists (see lib/grant-description.ts). Text is rendered as React
 * text nodes — no HTML is injected.
 */
export function GrantDescription({ text, className }: { text: string | null | undefined; className?: string }) {
  const blocks = parseGrantDescription(text);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-disc pl-5 space-y-0.5 mt-2 first:mt-0">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mt-2 first:mt-0">
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
