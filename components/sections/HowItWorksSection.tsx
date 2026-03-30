import * as LucideIcons from "lucide-react";
import { HowItWorksContent, IconColor } from "@/lib/sections/types";
import {
  getBackgroundClass,
  getTextColorForBackground,
  getEyebrowColorForBackground,
  getMutedTextColorForBackground,
} from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

const ICON_COLORS: Record<IconColor, string> = {
  green: "#d4f1ad",
  yellow: "#e8d5a3",
  blue: "#b2d1ee",
  lilac: "#c4b7eb",
};

function getIcon(iconName: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText: LucideIcons.FileText,
    Eye: LucideIcons.Eye,
    Clock: LucideIcons.Clock,
    Banknote: LucideIcons.Banknote,
    DollarSign: LucideIcons.DollarSign,
    Coins: LucideIcons.Coins,
    CheckCircle: LucideIcons.CheckCircle,
    CircleCheck: LucideIcons.CircleCheck,
    Gift: LucideIcons.Gift,
    Package: LucideIcons.Package,
    ShieldCheck: LucideIcons.ShieldCheck,
    ClipboardList: LucideIcons.ClipboardList,
    Send: LucideIcons.Send,
    Search: LucideIcons.Search,
    CreditCard: LucideIcons.CreditCard,
    UserCheck: LucideIcons.UserCheck,
    Rocket: LucideIcons.Rocket,
    Calendar: LucideIcons.Calendar,
    MapPin: LucideIcons.MapPin,
    HandHeart: LucideIcons.HandHeart,
    Sparkles: LucideIcons.Sparkles,
    Star: LucideIcons.Star,
    Zap: LucideIcons.Zap,
    Tag: LucideIcons.Tag,
    Bookmark: LucideIcons.Bookmark,
    CalendarCheck: LucideIcons.CalendarCheck,
    Lock: LucideIcons.Lock,
    Shield: LucideIcons.Shield,
  };
  return icons[iconName] || LucideIcons.CheckCircle;
}

export default function HowItWorksSection({ content }: Props) {
  const c = content as unknown as HowItWorksContent;
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);
  const mutedTextColor = getMutedTextColorForBackground(c.background);
  const cardBgClass = c.background === "dove" ? "bg-white/40" : "bg-white/10";
  const cardBorderClass = c.background === "dove" ? "border-white/50" : "border-white/20";
  const cardTextClass = c.background === "dove" ? "text-nfw-blackberry" : "text-white";
  const cardDescClass = c.background === "dove" ? "text-nfw-blackberry/70" : "text-white/70";

  return (
    <section className={`py-20 lg:py-28 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          {c.eyebrow && (
            <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-3`}>
              {c.eyebrow}
            </p>
          )}
          <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} mb-4 leading-tight`}>
            {c.headline}
          </h2>
          {c.subheadline && (
            <p className={`font-serif text-2xl ${mutedTextColor}`}>
              {c.subheadline}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {c.steps?.map((step, i) => {
            const IconComponent = getIcon(step.icon);
            return (
              <div
                key={i}
                className={`relative p-8 border ${cardBorderClass} text-center ${cardBgClass}`}
              >
                <div className="absolute top-4 left-5 font-ui text-xs font-black text-nfw-blackberry/30">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="inline-flex items-center justify-center w-20 h-20 mb-6"
                  style={{ backgroundColor: ICON_COLORS[step.icon_color] }}
                >
                  <IconComponent className="w-10 h-10 text-nfw-blackberry" />
                </div>
                <h3 className={`font-ui text-sm font-black tracking-[0.06em] uppercase ${cardTextClass} mb-3`}>
                  {step.title}
                </h3>
                <p className={`font-serif ${cardDescClass}`}>{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
