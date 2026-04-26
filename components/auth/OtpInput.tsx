"use client";

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  length = 8,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const [focusIndex, setFocusIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const newValue = value.split("").slice(0, index).join("") + digit + value.slice(index + 1);

    if (digit) {
      onChange(newValue.slice(0, length).padEnd(length, ""));
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        const newValue = value.split("").slice(0, index).join("") + "" + value.slice(index + 1);
        onChange(newValue.padEnd(length, ""));
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pastedData.padEnd(length, ""));
    if (inputRefs.current[Math.min(pastedData.length, length - 1)]) {
      inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => setFocusIndex(index)}
          disabled={disabled}
          className={`w-12 h-14 text-center text-2xl font-bold border rounded-lg transition-all ${
            disabled
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              : focusIndex === index
              ? "border-nfw-blackberry bg-white"
              : "border-gray-300 bg-white hover:border-nfw-blackberry/50"
          }`}
          style={{ fontFamily: "'DM Sans', monospace" }}
        />
      ))}
    </div>
  );
}