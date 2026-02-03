'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Offer {
  id: string
  type: string
  attributes: {
    offer_key: string
    title: string
    teaser: string
    terms: string
    offer_value: string
    offer_type: string
    redemption_method: string
    start_date: string
    end_date: string
  }
  relationships?: {
    merchant?: {
      data: {
        id: string
        type: string
      }
    }
    categories?: {
      data: Array<{ id: string; type: string }>
    }
  }
}

interface Category {
  id: string
  attributes: {
    category_key: string
    name: string
    icon_url?: string
  }
}

export default function PerksGrid() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [postalCode, setPostalCode] = useState('')
  const [searchZip, setSearchZip] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/perks/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories)
        }
      } catch (err) {
        console.error('Failed to load categories')
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: '20',
        })
        if (searchZip) params.append('postal_code', searchZip)
        if (selectedCategory) params.append('category_key', selectedCategory)

        const res = await fetch(`/api/perks?${params.toString()}`)
        if (!res.ok) {
          if (res.status === 401) throw new Error('Please sign in to view perks')
          throw new Error('Failed to load offers')
        }
        const data = await res.json()
        setOffers(data.offers)
        if (data.user?.postal_code && !searchZip) {
          setPostalCode(data.user.postal_code)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOffers()
  }, [page, searchZip, selectedCategory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchZip(postalCode)
    setPage(1)
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/auth/login" className="text-blue-600 underline">Sign in to continue</a>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className="border rounded px-4 py-2 w-40"
          pattern="^\d{5}$"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => { setSelectedCategory(null); setPage(1) }}
          className={`px-4 py-2 rounded-full text-sm ${
            !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.attributes.category_key); setPage(1) }}
            className={`px-4 py-2 rounded-full text-sm ${
              selectedCategory === cat.attributes.category_key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {cat.attributes.name}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12">Loading offers...</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                href={`/perks/${offer.attributes.offer_key}`}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                    {offer.attributes.offer_value}
                  </span>
                  <span className="text-xs text-gray-500">
                    {offer.attributes.offer_type}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{offer.attributes.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{offer.attributes.teaser}</p>
                <div className="text-xs text-gray-400">
                  {offer.attributes.redemption_method}
                </div>
              </Link>
            ))}
          </div>

          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={offers.length < 20}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {!loading && offers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No offers found for this location. Try a different ZIP code.
        </div>
      )}
    </div>
  )
}