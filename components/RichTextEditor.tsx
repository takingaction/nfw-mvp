"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export default function RichTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false, // ← Add this line
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write your article content here...",
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-nfw-blackberry/10 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-nfw-dove border-b border-nfw-blackberry/10 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 ${
            editor.isActive("bold") ? "bg-nfw-blackberry text-white" : "hover:bg-nfw-blackberry/10"
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 ${
            editor.isActive("italic") ? "bg-nfw-blackberry text-white" : "hover:bg-nfw-blackberry/10"
          }`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`px-3 py-1 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-nfw-blackberry text-white"
              : "hover:bg-nfw-blackberry/10"
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`px-3 py-1 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-nfw-blackberry text-white"
              : "hover:bg-nfw-blackberry/10"
          }`}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 ${
            editor.isActive("bulletList") ? "bg-nfw-blackberry text-white" : "hover:bg-nfw-blackberry/10"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 ${
            editor.isActive("orderedList") ? "bg-nfw-blackberry text-white" : "hover:bg-nfw-blackberry/10"
          }`}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 ${
            editor.isActive("blockquote") ? "bg-nfw-blackberry text-white" : "hover:bg-nfw-blackberry/10"
          }`}
        >
          Quote
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`px-3 py-1 ${
            editor.isActive("link") ? "bg-nfw-blackberry text-white" : "hover:bg-nfw-blackberry/10"
          }`}
        >
          Link
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-lg max-w-none p-4 min-h-[400px] focus:outline-none"
      />
    </div>
  );
}
