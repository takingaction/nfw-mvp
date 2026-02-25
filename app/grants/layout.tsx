export const metadata = {
  title: 'Microgrants',
  description: 'Apply for microgrants from $100–$5,000 to help with real-life needs — car repair, medical costs, childcare, and more.',
  openGraph: {
    title: 'Microgrants | National Fund for Women',
    description: 'Apply for microgrants from $100–$5,000 to help with real-life needs.',
    url: 'https://nationalfundforwomen.org/grants',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
