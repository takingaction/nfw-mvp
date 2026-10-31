"use client";

import { GrantDescription } from "@/components/grants/GrantDescription";

/** Admin textarea for a grant cycle description, with formatting hint and live preview. */
export function GrantDescriptionField({
  value,
  onChange,
  labelClass,
  inputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  labelClass: string;
  inputClass: string;
}) {
  return (
    <div>
      <label className={labelClass}>
        Description{" "}
        <span className="text-nfw-blackberry/40 font-normal">(Optional)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe this grant cycle..."
        rows={8}
        className={inputClass + " resize-y"}
      />
      <p className="text-xs font-ui text-nfw-blackberry/50 mt-1">
        Leave a blank line between paragraphs. Start a line with &quot;- &quot; to make a bullet point.
      </p>
      {value.trim() && (
        <div className="mt-3 rounded-lg border border-nfw-blackberry/10 bg-white p-3">
          <p className="text-xs font-ui font-semibold uppercase tracking-wide text-nfw-blackberry/40 mb-1.5">
            Preview
          </p>
          <GrantDescription text={value} className="text-sm font-serif text-nfw-blackberry/60" />
        </div>
      )}
    </div>
  );
}
