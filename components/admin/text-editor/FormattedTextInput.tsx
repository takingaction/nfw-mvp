"use client";

import { useRef } from "react";
import { VariableInserter } from "@/components/admin/email/VariableInserter";
import { LinkInserter } from "@/components/admin/email/LinkInserter";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showVariableInserter?: boolean;
  showLinkInserter?: boolean;
  ariaLabel?: string;
}

/**
 * Reusable text input with B/I/Link toolbar. Used by:
 *   - Email builder's `bullet_items` editor (EmailBlockEditor.tsx)
 *   - Grant cycle rejection-body block editor (RejectionBodyBlockRow.tsx)
 *
 * Consolidates the toolbar logic that previously lived in
 * EmailBlockEditor.tsx and StringArrayItem.tsx. Toolbar behavior:
 *   - Bold/Italic/Link wrap the currently-selected text with **, *, [text](url)
 *     respectively. If no selection, inserts placeholder text and selects it.
 *   - Variable inserter inserts `{{variable}}` at the cursor position.
 *
 * The component is intentionally minimal: it owns only the input element
 * and the toolbar. It does NOT know what variable names are valid; that's
 * the responsibility of the variable inserter.
 */
export function FormattedTextInput({
  value,
  onChange,
  placeholder,
  showVariableInserter = true,
  showLinkInserter = true,
  ariaLabel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = (replacement: string) => {
    const el = inputRef.current;
    if (!el) {
      onChange(value + replacement);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    onChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  const wrapSelection = (prefix: string, suffix: string, fallback: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const selectedText = text.substring(start, end);
    const newText = selectedText
      ? text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)
      : text.substring(0, start) + prefix + fallback + suffix + text.substring(end);
    onChange(newText);
    const cursorPos = start + prefix.length;
    const selectionLength = selectedText.length || fallback.length;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos + selectionLength);
    }, 0);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center border border-nfw-blackberry/20 rounded overflow-hidden">
        <button
          type="button"
          onClick={() => wrapSelection("**", "**", "bold")}
          className="px-2 py-1.5 text-xs font-bold text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrapSelection("*", "*", "italic")}
          className="px-2 py-1.5 text-xs italic text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors border-l border-nfw-blackberry/20"
          title="Italic"
        >
          I
        </button>
        {showLinkInserter && (
          <div className="border-l border-nfw-blackberry/20">
            <LinkInserter onInsert={insertAtCursor} />
          </div>
        )}
        {showVariableInserter && (
          <div className="border-l border-nfw-blackberry/20">
            <VariableInserter onInsert={insertAtCursor} />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
      />
    </div>
  );
}
