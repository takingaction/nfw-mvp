"use client";

import Link from "next/link";

type MembershipCardProps = {
  memberName: string;
  membershipLevel: string;
  joinedAt: string;
  avatarUrl: string | null;
  badgeFreeUrl: string;
  badgeContributingUrl: string;
  badgeFoundingUrl: string;
};

export default function MembershipCard({
  memberName,
  membershipLevel,
  joinedAt,
  avatarUrl,
  badgeFreeUrl,
  badgeContributingUrl,
  badgeFoundingUrl,
}: MembershipCardProps) {
  const joinedDate = joinedAt ? new Date(joinedAt) : null;
  const joinedMonth = joinedDate ? joinedDate.toLocaleDateString("en-US", { month: "short" }) : "";
  const joinedYear = joinedDate ? joinedDate.getFullYear() : "";

  const getBadgeUrl = () => {
    switch (membershipLevel) {
      case "contributing":
        return badgeContributingUrl;
      case "founding":
        return badgeFoundingUrl;
      default:
        return badgeFreeUrl;
    }
  };

  const getLevelDisplay = () => {
    switch (membershipLevel) {
      case "contributing":
        return "Contributing Member";
      case "founding":
        return "Founding Member";
      default:
        return "Free Member";
    }
  };

  const badgeUrl = membershipLevel === "founding" ? badgeFoundingUrl : null;
  const showUpgrade = membershipLevel !== "founding";

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-4">
        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg bg-nfw-stone/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt={memberName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-32 h-32 text-nfw-stone/30">
                <circle cx="50" cy="35" r="18" fill="currentColor" />
                <path d="M50 55 C25 55 10 75 10 90 L90 90 C90 75 75 55 50 55" fill="currentColor" />
              </svg>
            </div>
          )}
        </div>
        {badgeUrl && (
          <div
            className="absolute -top-1 -right-6 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md"
            style={{
              transform: "rotate(20deg)",
            }}
          >
            <img src={badgeUrl} alt={`${membershipLevel} badge`} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <h2 className="text-xl font-normal text-nfw-blackberry font-serif mb-1 text-center">{memberName}</h2>

      {joinedMonth && joinedYear && (
        <p className="text-sm text-nfw-blackberry/60 font-ui mb-4">
          Member since {joinedMonth} {joinedYear}
        </p>
      )}

      <div className="flex flex-col items-center gap-2 mb-4">
        <span
          className="px-4 py-2 text-sm font-bold font-ui bg-nfw-aubergine text-white"
        >
          {getLevelDisplay().toUpperCase()}
        </span>

        {showUpgrade && (
          <Link
            href="/profile"
            className="px-4 py-2 text-sm font-bold font-ui bg-[#7786BE] text-white hover:bg-[#7786BE]/90 uppercase"
          >
            Upgrade
          </Link>
        )}
      </div>

      <Link href="/profile" className="text-sm text-nfw-blackberry/60 hover:text-nfw-aubergine underline font-ui">
        Manage membership
      </Link>
    </div>
  );
}
