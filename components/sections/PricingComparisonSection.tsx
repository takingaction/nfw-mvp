import { Check } from "lucide-react";
import { PricingComparisonContent } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getMutedTextColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const CHECKED_COLORS: Record<string, string> = {
  aubergine: "#3e155f",
  wisteria: "#7786be",
  citrine: "#e8d5a3",
};

const UNCHECKED_COLORS: Record<string, string> = {
  blackberry10: "rgba(0,0,0,0.1)",
  blackberry20: "rgba(0,0,0,0.2)",
  wisteria20: "rgba(119,134,190,0.2)",
};

const DARK_CHECKED_COLORS = ["aubergine", "wisteria"];

export default function PricingComparisonSection({ content }: Props) {
  const c = content as unknown as PricingComparisonContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const checkedBg = CHECKED_COLORS[c.checkbox_checked] || CHECKED_COLORS.green;
  const uncheckedBg = UNCHECKED_COLORS[c.checkbox_unchecked] || UNCHECKED_COLORS.blackberry10;
  const isDarkChecked = DARK_CHECKED_COLORS.includes(c.checkbox_checked);
  const checkIconColor = isDarkChecked ? "#ffffff" : "#1a1a1a";
  const tableHeaderBg = c.background === "dove" ? "bg-nfw-aubergine" : "bg-white/20";
  const rowBgEven = c.background === "dove" ? "bg-nfw-dove" : "bg-white/5";
  const rowBgOdd = c.background === "dove" ? "bg-white" : "bg-white/10";

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {c.eyebrow && (
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
              {c.eyebrow}
            </p>
          )}
          <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-3`}>
            {c.headline}
          </h2>
          {c.subheadline && (
            <p className={mutedTextColor}>
              {c.subheadline}
            </p>
          )}
        </div>

        <div className={`border ${c.background === "dove" ? "border-nfw-blackberry/10" : "border-white/20"} overflow-hidden`}>
          <div className={`grid grid-cols-4 ${tableHeaderBg} px-6 py-4`}>
            <div className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-lilac">
              Benefit
            </div>
            <div className="text-center font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-lilac">
              {c.column1_label}
            </div>
            <div className="text-center font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-citrine">
              {c.column2_label}
            </div>
            <div className="text-center font-ui text-sm font-black tracking-[0.03em] uppercase" style={{ color: checkedBg }}>
              {c.column3_label}
            </div>
          </div>

          {c.benefits?.map((benefit, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 px-6 py-4 items-center ${
                i % 2 === 0 ? rowBgEven : rowBgOdd
              }`}
            >
              <div className={`font-serif text-sm ${textColor}`}>
                {benefit.label}
              </div>
              <div className="flex justify-center">
                {benefit.free ? (
                  <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: checkedBg }}>
                    <Check className="w-3 h-3" style={{ color: checkIconColor }} />
                  </div>
                ) : (
                  <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: uncheckedBg }}>
                    <span className="text-nfw-blackberry/30 text-xs">—</span>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                {benefit.contributing ? (
                  <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: checkedBg }}>
                    <Check className="w-3 h-3" style={{ color: checkIconColor }} />
                  </div>
                ) : (
                  <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: uncheckedBg }}>
                    <span className="text-nfw-blackberry/30 text-xs">—</span>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                {benefit.founding ? (
                  <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: checkedBg }}>
                    <Check className="w-3 h-3" style={{ color: checkIconColor }} />
                  </div>
                ) : (
                  <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: uncheckedBg }}>
                    <span className="text-nfw-blackberry/30 text-xs">—</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
