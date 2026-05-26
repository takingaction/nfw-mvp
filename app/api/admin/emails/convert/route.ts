import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminCheck";

interface ParsedBlock {
  section_type: string;
  content: Record<string, unknown>;
}

function getButtonColorFromStyle(style: string): string {
  if (style.includes("#F8F19A") || style.includes("rgb(248, 241, 154)")) return "citrine";
  if (style.includes("#7786BE") || style.includes("rgb(120, 134, 190)")) return "wisteria";
  if (style.includes("#B693C0") || style.includes("rgb(182, 147, 192)")) return "lilac";
  if (style.includes("#3E145F") || style.includes("rgb(62, 20, 95)")) return "aubergine";
  return "citrine"; // default
}

function parseHtmlToBlocks(htmlContent: string, templateId: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const processedIndices = new Set<number>();

  // Helper to check if a match index was already processed
  const isProcessed = (startIdx: number, endIdx: number) => {
    for (const idx of processedIndices) {
      if (startIdx <= idx && idx <= endIdx) return true;
    }
    return false;
  };

  // CTA button patterns to detect button-like links (NOT plain text links)
  const ctaPatterns = [
    // Pattern 1: <a> with inline style containing background-color (actual buttons)
    /<a\s+([^>]*?)style=["']([^"']*background-color[^"']*)["']([^>]*?)>([\s\S]*?)<\/a>/gi,
    // Pattern 2: <td> with <a> inside (table-based buttons)
    /<td[^>]*>[\s\S]*?<a\s+([^>]*?)>([\s\S]*?)<\/a>[\s\S]*?<\/td>/gi,
    // Pattern 3: explicit CTA phrases - only these specific patterns
    /<a\s+([^>]*?)>([^<]*?(VISIT\s+WEBSITE|CLICK\s+HERE|GET\s+STARTED|SIGN\s+UP|NEW\s+MEMBER|LEARN\s+MORE|APPLY\s+NOW|CONTACT\s+US|BECOME\s+A\s+MEMBER|GIFT\s+A\s+MEMBERSHIP)[^<]*?)<\/a>/gi,
  ];

  for (const ctaRegex of ctaPatterns) {
    let match;
    ctaRegex.lastIndex = 0; // Reset regex state

    while ((match = ctaRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || "";
      let linkText = (match[2] || match[0]).trim();

      // For table pattern, extract just the link text
      if (fullMatch.includes("<td") && fullMatch.includes("<a")) {
        const linkMatch = fullMatch.match(/<a\s+([^>]*?)>([\s\S]*?)<\/a>/i);
        if (linkMatch) {
          linkText = linkMatch[2].trim();
        }
      }

      // Strip any HTML tags from link text
      linkText = linkText.replace(/<[^>]+>/g, "").trim();

      if (!linkText) continue;

      // Extract href
      const hrefMatch = attributes.match(/href=["']([^"']+)["']/i) || fullMatch.match(/href=["']([^"']+)["']/i);
      const buttonUrl = hrefMatch ? hrefMatch[1] : "#";

      // Try to find background-color in the attributes or nearby styles
      const styleMatch = attributes.match(/style=["']([^"']+)["']/i) || fullMatch.match(/style=["']([^"']+)["']/i);
      let buttonColor = "citrine";
      if (styleMatch && styleMatch[1].includes("background-color")) {
        buttonColor = getButtonColorFromStyle(styleMatch[1]);
      }

      // Add CTA block
      blocks.push({
        section_type: "email_cta",
        content: {
          button_text: linkText,
          button_url: buttonUrl,
          button_color: buttonColor,
          text_align: "center",
        },
      });

      // Mark this region as processed to avoid duplicates
      processedIndices.add(match.index);
      processedIndices.add(match.index + fullMatch.length);
    }
  }

  // Match all <p>...</p> blocks
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let paragraphMatch;

  while ((paragraphMatch = paragraphRegex.exec(htmlContent)) !== null) {
    // Skip if this paragraph overlaps with already processed CTA
    const pStart = paragraphMatch.index;
    const pEnd = pStart + paragraphMatch[0].length;
    if (isProcessed(pStart, pEnd)) continue;

    let text = paragraphMatch[1];

    // Handle lists within paragraphs
    if (text.includes("<ul") || text.includes("<li")) {
      // Convert list items to bullet points
      text = text.replace(/<li[^>]*>/gi, "• ");
      text = text.replace(/<\/li>/gi, "\n");
      text = text.replace(/<ul[^>]*>/gi, "").replace(/<\/ul>/gi, "");
      text = text.replace(/<br\s*\/?>/gi, "\n");
      // Preserve <a> tags, remove other HTML
      text = text.replace(/<a\s+([^>]+)>/gi, '<a $1>');
      text = text.replace(/<strong>/gi, "**").replace(/<\/strong>/gi, "**");
      text = text.replace(/<em>/gi, "_").replace(/<\/em>/gi, "_");
      text = text.replace(/<[^>]+>(?![a-z])/g, "").trim(); // Remove tags that aren't <a>
      text = text.replace(/<a([^>]*)>/gi, '<a$1>'); // Clean up <a> tags
    } else {
      // Regular text - strip tags but preserve links and formatting
      text = text.replace(/<br\s*\/?>/gi, "\n");
      text = text.replace(/<strong>/gi, "**").replace(/<\/strong>/gi, "**");
      text = text.replace(/<em>/gi, "_").replace(/<\/em>/gi, "_");
      // Remove tags that aren't <a> or </a>
      text = text.replace(/<(?!a\s|\/a)[^>]+>/gi, "").trim();
    }

    if (text && text.length > 0) {
      blocks.push({
        section_type: "email_text",
        content: {
          text,
          text_align: "left",
        },
      });
    }
  }

// Handle standalone images (outside paragraphs and CTAs)
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let imgMatch;

  while ((imgMatch = imgRegex.exec(htmlContent)) !== null) {
    const imgStart = imgMatch.index;
    const imgEnd = imgStart + imgMatch[0].length;
    if (isProcessed(imgStart, imgEnd)) continue;

    const srcMatch = imgMatch[0].match(/src=["']([^"']+)["']/i);
    const altMatch = imgMatch[0].match(/alt=["']([^"']*)["']/i);
    if (srcMatch) {
      blocks.push({
        section_type: "email_image",
        content: {
          image_url: srcMatch[1],
          alt_text: altMatch ? altMatch[1] : "",
          width: "full",
        },
      });
    }
  }

  // Handle standalone horizontal rules
  const hrRegex = /<hr[^>]*>/gi;
  let hrMatch;

  while ((hrMatch = hrRegex.exec(htmlContent)) !== null) {
    blocks.push({
      section_type: "email_divider",
      content: {
        color: "#B693C0",
        thickness: 1,
        width: "full",
      },
    });
  }

  return blocks;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateSlug } = await request.json().catch(() => ({}));

  try {
    // Fetch template(s)
    let query = supabase
      .from("email_templates")
      .select("id, slug, name, html_content")
      .not("html_content", "is", null)
      .not("html_content", "eq", "");

    if (templateSlug) {
      query = query.eq("slug", templateSlug);
    }

    const { data: templates, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch templates", details: fetchError }, { status: 500 });
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ message: "No templates to convert", converted: 0 });
    }

    const results: { slug: string; sections_created: number; error?: string }[] = [];

    for (const template of templates) {
      if (!template.html_content) {
        results.push({ slug: template.slug, sections_created: 0, error: "No html_content" });
        continue;
      }

      try {
        // Parse existing HTML into blocks
        const blocks = parseHtmlToBlocks(template.html_content, template.id);

        // Delete existing sections for this template
        await supabaseAdmin
          .from("email_sections")
          .delete()
          .eq("email_template_id", template.id);

        // Insert new sections
        if (blocks.length > 0) {
          const sectionsToInsert = blocks.map((block, index) => ({
            id: crypto.randomUUID(),
            email_template_id: template.id,
            section_type: block.section_type,
            order_index: index,
            content: block.content,
            visible: true,
          }));

          const { error: insertError } = await supabaseAdmin
            .from("email_sections")
            .insert(sectionsToInsert);

          if (insertError) {
            results.push({ slug: template.slug, sections_created: 0, error: insertError.message });
          } else {
            results.push({ slug: template.slug, sections_created: blocks.length });
          }
        } else {
          results.push({ slug: template.slug, sections_created: 0, error: "No blocks parsed" });
        }
      } catch (err) {
        results.push({ slug: template.slug, sections_created: 0, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      converted: results.filter((r) => r.error === undefined).length,
      total: templates.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: "Conversion failed", details: String(err) }, { status: 500 });
  }
}