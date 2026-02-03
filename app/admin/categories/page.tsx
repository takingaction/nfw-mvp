import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteCategoryButton from '@/components/DeleteCategoryButton'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  // Fetch all categories
  const { data: categories } = await supabase
    .from('zero_dollar_categories')
    .select('*')
    .order('display_order', { ascending: true })

  // Get item count for each category
  const categoriesWithCounts = await Promise.all(
    (categories || []).map(async (category) => {
      const { count } = await supabase
        .from('zero_dollar_items')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id)
      
      return {
        ...category,
        item_count: count || 0
      }
    })
  )

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Manage Categories</h1>
            <p className="text-gray-600 mt-2">Organize your store items by category</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/items"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium"
            >
              ← Back to Items
            </Link>
            <Link
              href="/admin/categories/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Category
            </Link>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categoriesWithCounts.map(category => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.display_order}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.item_count} items
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/categories/edit/${category.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </Link>
                      <DeleteCategoryButton 
                        categoryId={category.id} 
                        categoryName={category.name}
                        itemCount={category.item_count}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categoriesWithCounts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-gray-500 mb-4">No categories yet. Create your first category!</p>
              <Link
                href="/admin/categories/new"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                + Add First Category
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}