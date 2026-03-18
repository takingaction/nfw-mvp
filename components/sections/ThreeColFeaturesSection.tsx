import Link from "next/link";
import { ThreeColFeaturesContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

const COLUMN_COLORS = ["#3e155f", "#b693c0", "#7786be"];

export default function ThreeColFeaturesSection({ content }: Props) {
  const c = content as ThreeColFeaturesContent;

  return (
    <section>
      <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {c.columns?.map((col, i) => (
          <div
            key={i}
            className="relative overflow-hidden flex flex-col"
            style={{
              backgroundColor: COLUMN_COLORS[i] ?? "#3e155f",
              minHeight: "min(60vw, 520px)",
            }}
          >
            {col.background_image_url && (
              <>
                <img
                  src={col.background_image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nfw-blackberry/90 via-nfw-blackberry/50 to-nfw-blackberry/20" />
              </>
            )}

            <div
              className="relative flex flex-col h-full px-10 py-12"
              style={{ minHeight: "inherit" }}
            >
              {/* Eyebrow — top aligned */}
              {col.eyebrow && (
                <p className="font-ui text-xs font-black tracking-[0.08em] uppercase text-white mb-auto">
                  {col.eyebrow}
                </p>
              )}

              {/* Heading + body — vertically centered */}
              <div className="flex-1 flex flex-col justify-center py-8">
                <h3 className="font-serif italic text-2xl lg:text-3xl text-white mb-4 leading-snug">
                  {col.heading}
                </h3>
                <p className="font-serif text-base text-white leading-snug">
                  {col.body}
                </p>
                {col.bullets?.length > 0 && (
                  <ul className="space-y-2 mt-4 list-disc list-outside ml-6">
                    {col.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="font-serif text-base text-white leading-snug pl-1"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* CTA — bottom aligned, always citrine */}
              <div className="mt-auto">
                {col.cta_label && (
                  <Link
                    href={col.cta_url}
                    className="font-ui text-base font-black tracking-[0.08em] uppercase text-nfw-citrine hover:opacity-70 transition-opacity"
                  >
                    {col.cta_label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
