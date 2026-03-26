-- Migration: 013_add_three_column_stories_template.sql
-- Description: Add three_column_stories section template to section_templates

INSERT INTO section_templates (name, section_type, default_content, is_system)
VALUES (
  '3 Column Stories',
  'three_column_stories',
  '{
    "eyebrow": "Picks of the month",
    "background": "dove",
    "columns": [
      {
        "title": "A World With",
        "content": "In this episode of A World With, Trinbagonian writer, YouTuber and artist Andrew Sage explores the possibilities of a world with libraries of things.",
        "image_url": "",
        "link_text": "Listen now",
        "link_url": "#"
      },
      {
        "title": "Books",
        "content": "Healing Justice Ldn on disability justice. A curated reading list of texts and resources about collective care, interdependence, disability justice and building for our changing contexts.",
        "image_url": "",
        "link_text": "Read more",
        "link_url": "#"
      },
      {
        "title": "How Do We Grow?",
        "content": "Larissa Kennedy speaks with three organisations reshaping climate education and our relationship to environmental justice.",
        "image_url": "",
        "link_text": "Learn more",
        "link_url": "#"
      }
    ]
  }'::jsonb,
  true
);
