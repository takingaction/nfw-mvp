"use client";

import { useState } from "react";
import ArticleForm from "@/components/ArticleForm";
import ArticleCategoryManager from "@/components/admin/ArticleCategoryManager";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Author = {
  id: string;
  full_name: string;
};

export default function EditArticleClient({
  initialCategories,
  authors,
  userId,
  article,
}: {
  initialCategories: Category[];
  authors: Author[];
  userId: string;
  article: any;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const supabase = createClient();

  const refreshCategories = async () => {
    const { data } = await supabase
      .from("article_categories")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setCategories(data);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-nfw-blackberry font-serif">Edit Article</h1>
        <a
          href={`/articles/${article.slug}`}
          target="_blank"
          className="text-nfw-blackberry hover:text-nfw-blackberry/70 font-medium"
        >
          View Article
        </a>
      </div>
      <ArticleForm
        categories={categories}
        authors={authors}
        userId={userId}
        article={article}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
        onCategoriesChange={refreshCategories}
      />
      <ArticleCategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesChange={refreshCategories}
      />
    </>
  );
}
