import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-black text-[#2d1239]">404</h1>
      <h2 className="text-2xl font-bold text-[#2d1239]">Page Not Found</h2>
      <p className="text-[#2d1239]/60 max-w-md">
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <Link 
        href="/"
        className="mt-4 px-6 py-3 bg-[#2d1239] text-white rounded-lg font-semibold hover:opacity-80 transition-opacity"
      >
        Go Home
      </Link>
    </div>
  )
}
