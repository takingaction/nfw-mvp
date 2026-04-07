"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type Props = {
  content: string;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write your article content here...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-nfw-blackberry/20 rounded-md overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-nfw-blackberry/10 px-3 py-2 flex gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm font-bold rounded ${
            editor.isActive("bold")
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm italic rounded ${
            editor.isActive("italic")
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 text-sm font-bold rounded ${
            editor.isActive("heading", { level: 2 })
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 text-sm font-bold rounded ${
            editor.isActive("heading", { level: 3 })
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive("bulletList")
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive("orderedList")
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 text-sm rounded ${
            editor.isActive("blockquote")
              ? "bg-nfw-blackberry text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100"
          }`}
        >
          Quote
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-lg max-w-none"
      />
    </div>
  );
}
