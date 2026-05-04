"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableCodeProps {
  code: string;
}

export function CopyableCode({ code }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between bg-nfw-lilac/10 border border-nfw-lilac/20 rounded-lg px-4 py-3">
      <code className="text-xl font-mono font-bold text-nfw-aubergine tracking-wider">
        {code}
      </code>
      <button
        onClick={handleCopy}
        className="p-2 text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
