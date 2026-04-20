"use client";

type FeaturedItem = {
  id: string;
  type: "shopify_product" | "microgrant";
  title: string;
  image: string;
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
      <h2 className="text-2xl font-bold text-nfw-blackberry font-serif mb-8">
        Popular across NFW
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {featuredItems.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="relative group overflow-hidden rounded-lg aspect-[3/4]"
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
            <div className="absolute bottom-0 left-0 right-0">
              <div className="bg-[#F9D65D] px-2 py-2">
                <p className="text-sm font-bold text-nfw-blackberry font-ui truncate">
                  {item.title}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
