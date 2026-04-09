"use client";

import { useState, useEffect } from "react";
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

export default function NewArticleClient({
  initialCategories,
  authors,
  userId,
}: {
  initialCategories: Category[];
  authors: Author[];
  userId: string;
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
      <h1 className="text-4xl font-bold mb-8 text-nfw-blackberry font-serif">Create New Article</h1>
      <ArticleForm
        categories={categories}
        authors={authors}
        userId={userId}
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
