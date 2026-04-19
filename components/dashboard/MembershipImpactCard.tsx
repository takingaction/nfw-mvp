"use client";

type MembershipImpactCardProps = {
  totalSavings: number;
  micrograntsSavings: number;
  perksSavings: number;
  zeroDollarStoreSavings: number;
};

export default function MembershipImpactCard({
  totalSavings,
  micrograntsSavings,
  perksSavings,
  zeroDollarStoreSavings,
}: MembershipImpactCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-nfw-dove p-6 flex flex-col items-center justify-center">
      <p className="text-sm font-bold tracking-wide text-nfw-blackberry/60 mb-4 font-ui uppercase">
        Your Membership at Work
      </p>

      <h1 className="text-4xl md:text-5xl font-bold text-nfw-blackberry font-serif mb-8">
        {formatCurrency(totalSavings)} saved
      </h1>

      <div className="w-full bg-nfw-lilac/20 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-nfw-blackberry font-serif">
              {formatCurrency(micrograntsSavings)}
            </p>
            <p className="text-xs text-nfw-blackberry/60 font-ui uppercase mt-1">From Microgrants</p>
          </div>
          <div className="text-center border-x border-nfw-blackberry/10">
            <p className="text-2xl font-bold text-nfw-blackberry font-serif">
              {formatCurrency(perksSavings)}
            </p>
            <p className="text-xs text-nfw-blackberry/60 font-ui uppercase mt-1">From Perks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-nfw-blackberry font-serif">
              {formatCurrency(zeroDollarStoreSavings)}
            </p>
            <p className="text-xs text-nfw-blackberry/60 font-ui uppercase mt-1">From Zero Dollar Store</p>
          </div>
        </div>
      </div>
    </div>
  );
}
