"use client";

import Link from "next/link";

type BottomActionsProps = {
  squareImage1: string;
  squareImage1Link: string;
  squareImage2: string;
  squareImage2Link: string;
  squareImage3: string;
  squareImage3Link: string;
};

export default function BottomActions({
  squareImage1,
  squareImage1Link,
  squareImage2,
  squareImage2Link,
  squareImage3,
  squareImage3Link,
}: BottomActionsProps) {
  const items = [
    { image: squareImage1, link: squareImage1Link, label: "Contact Us" },
    { image: squareImage2, link: squareImage2Link, label: "Gift a Membership" },
    { image: squareImage3, link: squareImage3Link, label: "Share Your Story (Coming Soon)", disabled: true },
  ];

  return (
    <div className="bg-nfw-aubergine py-12 px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {items.map((item, index) => (
          <div key={index} className="relative aspect-[4/3] md:aspect-square rounded-lg overflow-hidden group">
            {item.image ? (
              <>
                <img
                  src={item.image}
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-end">
                  {item.disabled ? (
                    <div className="w-full">
                      <div className="bg-neutral-500 px-4 py-3">
                        <p className="text-center font-bold text-white font-ui uppercase text-sm">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ) : item.link ? (
                    <Link
                      href={item.link}
                      className="w-full"
                    >
                      <div className="bg-nfw-lilac hover:brightness-110 transition-all px-4 py-3">
                        <p className="text-center font-bold text-white font-ui uppercase text-sm">
                          {item.label}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="w-full">
                      <div className="bg-neutral-500 px-4 py-3">
                        <p className="text-center font-bold text-white font-ui uppercase text-sm">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-nfw-stone/20 flex items-center justify-center">
                <span className="text-nfw-stone/40 text-sm">No Image</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
