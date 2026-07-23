"use client";

import Link from "next/link";

type FeaturedItem = {
  id: string;
  type: "shopify_product" | "microgrant" | "article" | "perk";
  title: string;
  image: string;
  slug?: string;
  link?: string;
  button_label?: string;
};

type PopularAcrossNFWProps = {
  featuredItems: FeaturedItem[];
};

export default function PopularAcrossNFW({ featuredItems }: PopularAcrossNFWProps) {
  if (!featuredItems || featuredItems.length === 0) {
    return null;
  }

  const getLink = (item: FeaturedItem): string => {
    if (item.link) return item.link;
    if (item.type === "microgrant") return "/grants/apply";
    if (item.type === "article") return `/articles/${item.slug}`;
    if (item.type === "perk") return "/perks";
    return "/store";
  };

  const getButtonLabel = (item: FeaturedItem): string => {
    if (item.button_label) return item.button_label;
    if (item.type === "microgrant") return item.title;
    if (item.type === "article") return "Read More";
    if (item.type === "perk") return item.title;
    return "Shop Now";
  };

  const getBadgeColor = (item: FeaturedItem): string => {
    if (item.type === "microgrant") return "bg-nfw-wisteria";
    if (item.type === "article") return "bg-nfw-aubergine";
    if (item.type === "perk") return "bg-nfw-lilac";
    return "bg-nfw-citrine";
  };

  const getTextColor = (item: FeaturedItem): string => {
    if (item.type === "microgrant" || item.type === "article" || item.type === "perk") return "text-white";
    return "text-nfw-blackberry";
  };

  return (
    <div className="bg-nfw-lilac py-12 px-8">
      <h2 className="text-2xl font-bold text-white font-serif mb-8">
        Popular across NFW
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {featuredItems.slice(0, 5).map((item) => (
          <Link
            key={item.id}
            href={getLink(item)}
            className="relative group block aspect-square sm:aspect-[3/4]"
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-nfw-stone/20 flex items-center justify-center">
                <span className="text-nfw-stone/40 text-sm">No Image</span>
              </div>
            )}
            <div className="absolute inset-x-4 bottom-4">
              <div className={`mx-auto px-2 py-2 text-center ${getBadgeColor(item)}`}>
                <p className={`text-sm font-bold font-ui truncate ${getTextColor(item)}`}>
                  {getButtonLabel(item)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
