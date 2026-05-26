"use client";

import { useRouter } from "next/navigation";
import { EmailBuilder } from "./EmailBuilder";
import type { EmailSection, EmailTemplateExtended } from "@/lib/email-blocks/types";

interface Props {
  template: EmailTemplateExtended;
  initialSections: EmailSection[];
}

export default function EmailBuilderClient({ template, initialSections }: Props) {
  const router = useRouter();

  const handleSave = async (sections: EmailSection[]) => {
    const response = await fetch(`/api/admin/emails/${template.slug}/sections`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    });

    if (!response.ok) {
      throw new Error("Failed to save sections");
    }
  };

  const handlePublish = async () => {
    const response = await fetch(`/api/admin/emails/${template.slug}/publish`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to publish" };
    }

    return { success: true };
  };

  const handlePreview = async () => {
    const response = await fetch(`/api/admin/emails/${template.slug}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preview_data: {
          name: "Preview User",
          email: "preview@example.com",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate preview");
    }

    return data.html;
  };

  const handleSendTest = async (email: string) => {
    const response = await fetch(`/api/admin/emails/${template.slug}/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testEmail: email }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      message: data.message || data.error || "Unknown response",
    };
  };

  const handleHeroImageSave = async (heroImageUrl: string) => {
    const response = await fetch(`/api/admin/emails/${template.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hero_image_url: heroImageUrl || null }),
    });

    if (!response.ok) {
      throw new Error("Failed to save hero image");
    }
  };

  return (
    <EmailBuilder
      template={template}
      initialSections={initialSections}
      onSave={handleSave}
      onPublish={handlePublish}
      onPreview={handlePreview}
      onSendTest={handleSendTest}
      onHeroImageSave={handleHeroImageSave}
    />
  );
}