import Link from "next/link";
import { SplitWhyNfwContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function SplitWhyNfwSection({ content }: Props) {
  const c = content as unknown as SplitWhyNfwContent;
  const parts = c.headline.split(c.headline_italic_phrase);

  return (
    <section className="bg-nfw-dove py-20 lg:py-28">
      {/* 1. Added lg:px-12 here for desktop padding */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-12">
        {/* 2. Changed to 60/40 split and kept your gap */}
        <div className="grid lg:grid-cols-[6fr_4fr] gap-12 lg:gap-20 items-center">
          {/* Left — 60% (No span class needed with custom grid-cols) */}
          <div className="space-y-7">
            {c.eyebrow && (
              <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine">
                {c.eyebrow}
              </p>
            )}
            <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine leading-[1.1]">
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className="font-serif text-2xl text-nfw-aubergine max-w-full">
              {c.body}
            </p>
            {c.cta_label && (
              <Link
                href={c.cta_url}
                className="inline-flex items-center justify-center px-8 py-4 bg-nfw-aubergine text-nfw-dove font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
              >
                {c.cta_label}
              </Link>
            )}
          </div>

          {/* Right — 40% (No span class needed) */}
          <div
            className="relative min-h-[480px] flex items-center justify-center"
            style={{ backgroundColor: "#3e155f", padding: "20px" }}
          >
            {/* Quote marks and blockquote stay the same */}
            <span
              className="absolute top-0 left-2 font-serif leading-none select-none pointer-events-none"
              style={{ fontSize: "200px", color: "#4B216C", lineHeight: 1 }}
            >
              &ldquo;
            </span>
            <span
              className="absolute bottom-0 font-serif leading-none select-none pointer-events-none"
              style={{
                fontSize: "200px",
                color: "#4B216C",
                lineHeight: 1,
                right: "30px",
                transform: "translateY(40%)",
              }}
            >
              &rdquo;
            </span>
            <blockquote className="relative z-10 font-serif italic text-2xl lg:text-3xl text-white leading-relaxed text-center">
              {c.pullquote}
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
