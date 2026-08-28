import Link from "next/link";
import Image from "next/image";
import { ZeroDollarStoreTeaserContent } from "@/lib/sections/types";
import { getBackgroundClass, getTextColorForBackground, getEyebrowColorForBackground } from "@/lib/colors";

interface Props {
  content: Record<string, unknown>;
}

async function getFeaturedProducts() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/shopify/products?featured=true`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export default async function ZeroDollarStoreTeaserSection({ content }: Props) {
  const c = content as unknown as ZeroDollarStoreTeaserContent;
  const parts = (c.headline || "").split(c.headline_italic_phrase || "");
  const products = await getFeaturedProducts();
  const bgClass = getBackgroundClass(c.background);
  const textColor = getTextColorForBackground(c.background);
  const eyebrowColor = getEyebrowColorForBackground(c.background);

  return (
    <section className={`${bgClass} py-20 lg:py-28`}>
      <div className="px-4 sm:px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-12">
            {c.eyebrow && (
              <p className={`font-ui text-xs font-black tracking-[0.06em] uppercase ${eyebrowColor} mb-6`}>
                {c.eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-4xl lg:text-6xl ${textColor} leading-[1.1] mb-6`}>
              {parts[0]}
              <em className="italic">{c.headline_italic_phrase}</em>
              {parts[1]}
            </h2>
            <p className={`font-serif text-2xl ${textColor} max-w-2xl mx-auto`}>{c.body}</p>
          </div>

          {products.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {products.slice(0, 3).map((product: { shopifyProductId: string; title: string; imageUrl: string }) => (
                  <Link href="/store" key={product.shopifyProductId} className="block">
                    <div className="relative aspect-square overflow-hidden bg-nfw-stone/10">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-nfw-powder/20" />
                      )}
                    </div>
                    <div className="py-4">
                      <p className="font-serif text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry">
                        {product.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex justify-center mt-8">
                <Link
                  href={c.cta_url}
                  className="inline-flex items-center justify-center px-20 py-6 text-xl font-black tracking-[0.06em] uppercase bg-nfw-citrine text-nfw-blackberry hover:opacity-90 transition-opacity font-ui"
                >
                  {c.cta_label}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
