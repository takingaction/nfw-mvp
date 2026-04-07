"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="border rounded-lg p-4 bg-gray-50 animate-pulse">
      <p className="text-gray-500">Loading editor...</p>
    </div>
  ),
});

import ImageUpload from "./ImageUpload";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Author = {
  id: string;
  full_name: string;
  email: string;
};

export default function ArticleForm({
  categories,
  authors,
  userId,
  article,
}: {
  categories: Category[];
  authors: Author[];
  userId: string;
  article?: any;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    excerpt: article?.excerpt || "",
    content: article?.content || "",
    category_id: article?.category_id || "",
    author_id: article?.author_id || "",
    tags: article?.tags?.join(", ") || "",
    featured_image_url: article?.featured_image_url || "",
    hero_image_url: article?.hero_image_url || "",
    meta_title: article?.meta_title || "",
    meta_description: article?.meta_description || "",
    is_published: article?.is_published || false,
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Timeout to prevent infinite hang
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please try again.");
    }, 30000);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      const articleData = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        content: formData.content,
        category_id: formData.category_id || null,
        author_id: formData.author_id || null,
        tags: tagsArray,
        featured_image_url: formData.featured_image_url || null,
        hero_image_url: formData.hero_image_url || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (article) {
        // Update existing article
        console.log("[ArticleForm] Updating article:", article.id, articleData);
        const { error: updateError } = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", article.id);

        console.log("[ArticleForm] Update result:", { error: updateError });
        if (updateError) throw updateError;
      } else {
        // Create new article
        const { error: insertError } = await supabase
          .from("articles")
          .insert(articleData);

        if (insertError) throw insertError;
      }

      clearTimeout(timeoutId);
      router.push("/admin/articles");
      router.refresh();
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="Enter article title"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Slug *
        </label>
        <input
          type="text"
          required
          value={formData.slug}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, slug: e.target.value }))
          }
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="article-url-slug"
        />
        <p className="text-sm text-nfw-blackberry/50 mt-1">
          URL: /articles/{formData.slug || "article-url-slug"}
        </p>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Excerpt
        </label>
        <textarea
          value={formData.excerpt}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
          }
          rows={3}
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="Brief summary of the article"
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Content *
        </label>
        <RichTextEditor
          content={formData.content}
          onChange={(html) =>
            setFormData((prev) => ({ ...prev, content: html }))
          }
        />
      </div>

      {/* Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-nfw-blackberry mb-2">
            Category
          </label>
          <select
            value={formData.category_id}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category_id: e.target.value }))
            }
            className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Author */}
        <div>
          <label className="block text-sm font-medium text-nfw-blackberry mb-2">
            Author
          </label>
          <select
            value={formData.author_id}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, author_id: e.target.value }))
            }
            className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          >
            <option value="">Select author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-nfw-blackberry mb-2">
          Tags
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tags: e.target.value }))
          }
          className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
          placeholder="tag1, tag2, tag3"
        />
        <p className="text-sm text-nfw-blackberry/50 mt-1">Separate tags with commas</p>
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageUpload
          label="Featured Image"
          currentUrl={formData.featured_image_url}
          onUpload={(url) =>
            setFormData((prev) => ({ ...prev, featured_image_url: url }))
          }
        />

        <ImageUpload
          label="Hero Image"
          currentUrl={formData.hero_image_url}
          onUpload={(url) =>
            setFormData((prev) => ({ ...prev, hero_image_url: url }))
          }
        />
      </div>

      {/* SEO */}
      <div className="border-t border-nfw-blackberry/10 pt-6">
        <h3 className="text-lg font-semibold text-nfw-blackberry mb-4">SEO Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-nfw-blackberry mb-2">
              Meta Title
            </label>
            <input
              type="text"
              value={formData.meta_title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, meta_title: e.target.value }))
              }
              className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
              placeholder="Leave blank to use article title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nfw-blackberry mb-2">
              Meta Description
            </label>
            <textarea
              value={formData.meta_description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  meta_description: e.target.value,
                }))
              }
              rows={2}
              className="w-full px-4 py-2 border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry focus:ring-2 focus:ring-nfw-lilac"
              placeholder="Leave blank to use excerpt"
            />
          </div>
        </div>
      </div>

      {/* Publish Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_published"
          checked={formData.is_published}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
          }
          className="w-4 h-4 accent-nfw-blackberry"
        />
        <label
          htmlFor="is_published"
          className="text-sm font-medium text-nfw-blackberry"
        >
          Publish article (make it visible to users)
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t border-nfw-blackberry/10">
        <button
          type="submit"
          disabled={loading}
          className="bg-nfw-blackberry text-white px-6 py-3 hover:bg-nfw-blackberry/90 font-medium disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : article
              ? "Update Article"
              : "Create Article"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/articles")}
          className="bg-nfw-dove text-nfw-blackberry px-6 py-3 hover:bg-nfw-blackberry/5 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
