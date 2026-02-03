'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteItemButton({
  itemId,
  itemName
}: {
  itemId: string
  itemName: string
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setDeleting(true)

    try {
      // Check if item has claims
      const { data: claims } = await supabase
        .from('zero_dollar_claims')
        .select('id')
        .eq('item_id', itemId)
        .limit(1)

      if (claims && claims.length > 0) {
        alert('Cannot delete item with existing claims. Set it to inactive instead.')
        setShowConfirm(false)
        setDeleting(false)
        return
      }

      // Delete item
      const { error } = await supabase
        .from('zero_dollar_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      router.refresh()
      setShowConfirm(false)
    } catch (err: any) {
      alert('Error deleting item: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-600 hover:text-red-800 font-medium"
      >
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Delete Item?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{itemName}</strong>"? 
              This action cannot be undone.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Note: Items with existing claims cannot be deleted.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}