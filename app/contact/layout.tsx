export const metadata = {
  title: "Contact Us",
  description: "Get in touch with the National Fund for Women team.",
  openGraph: {
    title: "Contact Us | National Fund for Women",
    description: "Get in touch with the NFW team.",
    url: "https://nationalfundforwomen.org/contact",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
