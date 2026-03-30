"use client";

import { useState, useRef, useEffect } from "react";
import { FaqContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";
import { ChevronDown } from "lucide-react";

interface Props {
  content: Record<string, unknown>;
}

function parseMarkdownLinks(text: string, linkClass: string): string {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)(?:\|(\w+))?/g,
    (match, linkText, url, target) => {
      const attrs = target === '_blank'
        ? ` target="_blank" rel="noopener noreferrer"`
        : '';
      return `<a href="${url}" class="${linkClass}"${attrs}>${linkText}</a>`;
    }
  );
}

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  textColor,
  hoverColor,
  linkClass,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  textColor: string;
  hoverColor: string;
  linkClass: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  const parsedAnswer = parseMarkdownLinks(answer, linkClass);

  return (
    <div className="border-b border-nfw-dove/10">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
        aria-expanded={isOpen}
      >
          <span className={`font-serif text-xl ${textColor} pr-8 group-hover:${hoverColor} transition-colors duration-300`}>
          {question}
        </span>
        <ChevronDown
          className={`flex-shrink-0 w-5 h-5 ${hoverColor} transition-transform duration-500 ease-in-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        style={{
          height: `${height}px`,
          overflow: "hidden",
          transition: "height 450ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div ref={contentRef} className="pb-6">
          <p
            className={`font-serif text-lg ${textColor} leading-relaxed`}
            dangerouslySetInnerHTML={{ __html: parsedAnswer }}
          />
        </div>
      </div>
    </div>
  );
}

export default function FaqSection({ content }: Props) {
  const c = content as unknown as FaqContent;
  const [open, setOpen] = useState<number | null>(null);
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const hoverColor = c.background === "dove" ? "text-nfw-aubergine" : "text-nfw-citrine";

  return (
    <section className={`${bgClass} py-20 lg:py-28`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {c.eyebrow && (
          <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-6 text-center`}>
            {c.eyebrow}
          </p>
        )}
        {c.heading && (
          <h2 className={`font-serif text-4xl lg:text-5xl ${textColor} mb-16 text-center leading-[1.1]`}>
            {c.heading}
          </h2>
        )}
        <div>
          {c.items?.map((item, i) => (
            <AccordionItem
              key={i}
              question={item.question}
              answer={item.answer}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              textColor={textColor}
              hoverColor={hoverColor}
              linkClass={c.background === "dove" ? "text-nfw-aubergine underline hover:text-nfw-lilac transition-colors" : "text-nfw-citrine underline hover:text-nfw-lilac transition-colors"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
