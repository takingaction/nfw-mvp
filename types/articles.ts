export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  hero_image_url: string | null;
  author_id: string | null;
  category_id: string | null;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  like_count: number;
  meta_title: string | null;
  meta_description: string | null;
  show_as_nfw_team: boolean;
};

export type ArticleCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  article_count: number;
  created_at: string;
};

export type ArticleLike = {
  id: string;
  article_id: string;
  user_id: string;
  created_at: string;
};

export type ArticleWithDetails = Article & {
  author?: {
    full_name: string;
  };
  category?: ArticleCategory;
  user_has_liked?: boolean;
};
