"use client";

import { Clock } from "lucide-react";

interface NfwPerkOfferCardProps {
  perk: {
    id: string;
    title: string;
    description: string | null;
    partner_name: string | null;
    partner_logo_url: string | null;
    landing_page_url: string | null;
    estimated_value: number | null;
    terms_and_conditions: string | null;
    categories: string[];
    expires_at: string | null;
    userHasRedeemed?: boolean;
  };
  liked?: boolean;
  onToggleLike?: (perkId: string, liked: boolean) => void;
  onClick?: () => void;
}

function formatExpiry(date: string | null): string | null {
  if (!date) return null;
  const expiryDate = new Date(date);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) return "Expired";
  if (daysUntilExpiry === 0) return "Today";
  if (daysUntilExpiry === 1) return "Tomorrow";
  if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days`;
  return expiryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function NfwPerkOfferCard({
  perk,
  liked = false,
  onToggleLike,
  onClick,
}: NfwPerkOfferCardProps) {
  const expiryText = formatExpiry(perk.expires_at);

  const cardContent = (
    <div className="flex p-4 gap-4 flex-1">
      <div className="flex-shrink-0">
        <div className="w-20 h-20 border border-nfw-blackberry/10 bg-nfw-dove overflow-hidden flex items-center justify-center">
          {perk.partner_logo_url ? (
            <img
              src={perk.partner_logo_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl opacity-30">🎁</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {perk.partner_name && (
          <div className="text-sm font-semibold text-nfw-blackberry mb-1">
            {perk.partner_name}
          </div>
        )}

        <h3 className="text-nfw-blackberry/70 text-sm mb-2 line-clamp-2 leading-tight flex-1">
          {perk.title}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {perk.estimated_value && perk.estimated_value > 0 && (
            <span className="text-xs bg-nfw-citrine text-nfw-blackberry px-2 py-0.5 font-medium">
              ${perk.estimated_value.toFixed(2)}
            </span>
          )}

          {perk.categories && perk.categories.length > 0 && (
            <span className="text-xs bg-nfw-dove text-nfw-blackberry/60 px-2 py-0.5">
              {perk.categories[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-nfw-blackberry/40 mt-auto">
          {expiryText && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {expiryText}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <div onClick={onClick} className="block h-full cursor-pointer">
        <div className="bg-white border border-nfw-blackberry/10 hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="block h-full">
      <div className="bg-white border border-nfw-blackberry/10 hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col">
        {cardContent}
      </div>
    </div>
  );
}
