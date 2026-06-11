"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductDetailPanelProps {
  product: {
    shopifyProductId: string;
    title: string;
    description: string;
    imageUrl: string;
    images: string[];
    availableForSale: boolean;
    variants: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      options: Array<{ name: string; value: string }>;
    }>;
    status: "ACTIVE" | "DRAFT" | "ARCHIVED" | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailPanel({
  product,
  isOpen,
  onClose,
}: ProductDetailPanelProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const allImages = product?.images?.length ? product.images : product?.imageUrl ? [product.imageUrl] : [];

  const decodeHTMLEntities = (text: string): string => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  };

  useEffect(() => {
    setCurrentImageIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [product?.shopifyProductId]);

  const scrollToImage = (index: number) => {
    setCurrentImageIndex(index);
    imageRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    setCurrentImageIndex(index);
  };

  const goToPrevious = () => {
    if (currentImageIndex > 0) {
      scrollToImage(currentImageIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentImageIndex < allImages.length - 1) {
      scrollToImage(currentImageIndex + 1);
    }
  };

  const getVariantInfo = () => {
    if (!product?.variants?.length || product.variants[0].title === "Default") {
      return null;
    }
    const optionMap: Record<string, Set<string>> = {};
    product.variants.forEach((variant) => {
      variant.options.forEach((opt) => {
        if (opt.name !== "Title" && opt.value !== "Default Title") {
          if (!optionMap[opt.name]) {
            optionMap[opt.name] = new Set();
          }
          optionMap[opt.name].add(opt.value);
        }
      });
    });
    return Object.entries(optionMap).map(([name, values]) => ({
      name,
      options: Array.from(values),
    }));
  };

  const variantInfo = getVariantInfo();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      <div
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms ease-out",
        }}
        className="fixed inset-y-0 left-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-nfw-blackberry/10 bg-nfw-dove">
            <div className="w-10" />
            <h2 className="font-ui text-sm font-black tracking-[0.03em] text-nfw-blackberry uppercase">
              Product Details
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-nfw-blackberry/10 transition-colors text-nfw-blackberry/60 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {allImages.length > 0 && (
              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {allImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      ref={(el) => { imageRefs.current[index] = el; }}
                      className="flex-shrink-0 w-full aspect-[3/4] bg-nfw-stone/10 snap-center"
                    >
                      <img
                        src={imageUrl}
                        alt={`${product?.title || "Product"} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      disabled={currentImageIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-30"
                    >
                      <ChevronLeft className="w-5 h-5 text-nfw-blackberry" />
                    </button>
                    <button
                      onClick={goToNext}
                      disabled={currentImageIndex === allImages.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-30"
                    >
                      <ChevronRight className="w-5 h-5 text-nfw-blackberry" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {allImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => scrollToImage(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex
                              ? "bg-nfw-aubergine"
                              : "bg-nfw-blackberry/30 hover:bg-nfw-blackberry/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-ui text-base font-black tracking-[0.03em] text-nfw-blackberry uppercase">
                    {product?.title}
                  </h3>
                  {product?.status === "DRAFT" && (
                    <span className="bg-nfw-lilac text-white px-2 py-1 font-ui text-xs font-black tracking-[0.06em] uppercase shrink-0">
                      Dropping Soon
                    </span>
                  )}
                  {!product?.availableForSale && product?.status !== "DRAFT" && (
                    <span className="bg-nfw-aubergine text-white px-2 py-1 font-ui text-xs font-black tracking-[0.06em] uppercase shrink-0">
                      Out of Stock
                    </span>
                  )}
                </div>

                {product?.description && (
                  <div
                    className="font-sans text-sm text-nfw-blackberry/70 leading-relaxed [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-1 [&_a]:text-nfw-aubergine [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.description) }}
                  />
                )}
              </div>

              {variantInfo && variantInfo.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-ui text-xs font-black tracking-[0.03em] uppercase text-nfw-blackberry/60 mb-3">
                    Available Options
                  </h4>
                  <div className="space-y-3">
                    {variantInfo.map((variant) => (
                      <div key={variant.name}>
                        <span className="font-ui text-xs font-medium text-nfw-blackberry/50 mb-1 block">
                          {variant.name}:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {variant.options.map((option) => (
                            <span
                              key={option}
                              className="px-3 py-1.5 bg-nfw-stone/20 font-sans text-xs text-nfw-blackberry/70"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-nfw-blackberry/10">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs font-medium text-nfw-blackberry/50">
                    Product ID
                  </span>
                  <span className="font-sans text-xs text-nfw-blackberry/50">
                    {product?.shopifyProductId?.split("/").pop()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}