"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteCategoryButton({
  categoryId,
  categoryName,
  itemCount,
}: {
  categoryId: string;
  categoryName: string;
  itemCount: number;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (itemCount > 0) {
      alert(
        `Cannot delete category with ${itemCount} items. Please reassign or delete the items first.`,
      );
      setShowConfirm(false);
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("zero_dollar_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      router.refresh();
      setShowConfirm(false);
    } catch (err: any) {
      alert("Error deleting category: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

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
            <h3 className="text-xl font-bold mb-4">Delete Category?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{categoryName}</strong>"?
            </p>
            {itemCount > 0 && (
              <p className="text-sm text-red-600 mb-6">
                ⚠️ This category has {itemCount} items. You must reassign or
                delete them first.
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting || itemCount > 0}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
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
  );
}
