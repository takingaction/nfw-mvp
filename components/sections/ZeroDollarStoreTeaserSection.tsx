import Link from "next/link";
import Image from "next/image";
import { ZeroDollarStoreTeaserContent } from "@/lib/sections/types";

interface Props {
  content: Record<string, unknown>;
}

export default function ZeroDollarStoreTeaserSection({ content }: Props) {
  const c = content as unknown as ZeroDollarStoreTeaserContent;
  const parts = c.headline.split(c.headline_italic_phrase);

  return (
    <section className="bg-nfw-dove py-20 lg:py-28">
      {/* Centered copy */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        {c.eyebrow && (
          <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-aubergine mb-6">
            {c.eyebrow}
          </p>
        )}
        <h2 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine leading-[1.1] mb-6">
          {parts[0]}
          <em className="italic">{c.headline_italic_phrase}</em>
          {parts[1]}
        </h2>
        <p className="font-serif text-2xl text-nfw-blackberry">{c.body}</p>
      </div>

      {/* Product grid */}
      {c.products?.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-nfw-stone/20">
            {c.products.slice(0, 3).map((product, i) => (
              <div key={i} className="bg-nfw-dove group">
                <div className="aspect-square overflow-hidden bg-nfw-stone/10 relative">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-nfw-powder/20" />
                  )}
                </div>
                <div className="px-4 py-4 flex justify-between items-baseline">
                  <span className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry">
                    {product.name}
                  </span>
                  <span className="font-serif text-xs text-nfw-blackberry/50">
                    {product.retail_price}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Shop CTA */}
          <div className="flex justify-end mt-6">
            <Link
              href={c.cta_url}
              className="inline-flex items-center gap-2 font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry border border-nfw-blackberry/30 px-6 py-3 hover:border-nfw-blackberry transition-colors"
            >
              {c.cta_label}
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
