"use client";

import Link from "next/link";

type FeaturedItem = {
  id: string;
  type: "shopify_product" | "microgrant" | "article";
  title: string;
  image: string;
  slug?: string;
};

type PopularAcrossNFWProps = {
  featuredItems: FeaturedItem[];
};

export default function PopularAcrossNFW({ featuredItems }: PopularAcrossNFWProps) {
  if (!featuredItems || featuredItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-nfw-lilac py-12 px-8">
      <h2 className="text-2xl font-bold text-white font-serif mb-8">
        Popular across NFW
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {featuredItems.slice(0, 5).map((item) => (
          <Link
            key={item.id}
            href={item.type === "microgrant" ? "/grants/apply" : item.type === "article" ? `/articles/${item.slug}` : "/store"}
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
              <div className={`mx-auto px-2 py-2 text-center ${
                item.type === "microgrant" ? "bg-nfw-wisteria" :
                item.type === "article" ? "bg-nfw-aubergine" :
                "bg-nfw-citrine"
              }`}>
                <p className={`text-sm font-bold font-ui truncate ${item.type === "microgrant" ? "text-white" : item.type === "article" ? "text-white" : "text-nfw-blackberry"}`}>
                  {item.title}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
