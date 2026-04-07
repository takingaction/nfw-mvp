"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteArticleButton from "@/components/DeleteArticleButton";
import ArticleCategoryManager from "./ArticleCategoryManager";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  author?: {
    full_name: string;
  };
  category?: {
    name: string;
  };
};

export default function AdminArticlesClient({
  initialArticles,
}: {
  initialArticles: Article[];
}) {
  const [articles] = useState(initialArticles);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-nfw-blackberry font-serif">
            Manage Articles
          </h1>
          <p className="text-nfw-blackberry/60 mt-2">
            Create, edit, and manage all articles
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="bg-nfw-lilac text-white px-6 py-3 font-medium hover:bg-nfw-lilac/90"
          >
            Manage Categories
          </button>
          <Link
            href="/admin/articles/new"
            className="bg-nfw-blackberry text-white px-6 py-3 font-medium hover:bg-nfw-blackberry/90"
          >
            + New Article
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-nfw-dove border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Likes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles?.map((article) => (
              <tr key={article.id} className="hover:bg-nfw-dove/50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium text-nfw-blackberry">
                        {article.title}
                      </div>
                      <div className="text-sm text-nfw-blackberry/50">
                        By {article.author?.full_name || "Unknown"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold ${
                      article.is_published
                        ? "bg-[#d4f1ad] text-nfw-blackberry"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {article.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-nfw-blackberry/50">
                  {article.category?.name || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-nfw-blackberry/50">
                  {article.view_count}
                </td>
                <td className="px-6 py-4 text-sm text-nfw-blackberry/50">
                  {article.like_count}
                </td>
                <td className="px-6 py-4 text-sm text-nfw-blackberry/50">
                  {new Date(article.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/articles/edit/${article.id}`}
                      className="text-nfw-blackberry hover:text-nfw-blackberry/70 font-medium"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/articles/${article.slug}`}
                      target="_blank"
                      className="text-nfw-blackberry/50 hover:text-nfw-blackberry font-medium"
                    >
                      View
                    </Link>
                    <DeleteArticleButton
                      articleId={article.id}
                      articleTitle={article.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {articles?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-nfw-blackberry/50">
              No articles yet. Create your first article!
            </p>
          </div>
        )}
      </div>

      <ArticleCategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />
    </>
  );
}
