export const metadata = {
  title: "Perks & Discounts",
  description:
    "1,000+ member perks and discounts for everyday savings. Exclusive deals for NFW members.",
  openGraph: {
    title: "Perks & Discounts | National Fund for Women",
    description: "1,000+ member perks and discounts for everyday savings.",
    url: "https://nationalfundforwomen.org/perks",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
