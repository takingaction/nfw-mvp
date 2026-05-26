# Email Builder - Build Plan

**Created:** 2026-05-24
**Status:** In Development
**Goal:** Visual email builder for admins to create/edit emails section-by-section

---

## Context

- Reuse page builder patterns (drag-drop, section editor, templates)
- Fixed NFW branded shell (header, footer, colors)
- Drag-and-drop section reordering required
- Full HTML snapshot saved on publish to ensure correct rendering
- Variables inserted via dropdown in any text field (Option A)

---

## User Decisions

| Question | Answer |
|-----------|--------|
| Shell customization | Fixed shell (NFW branding) |
| Section reordering | Yes - drag/drop reorder |
| HTML storage | Save full HTML snapshot on publish |
| Existing templates | Convert to section-based |
| Variables | Insert button + dropdown in any text field |
| Scheduling | Not in scope |

---

## Architecture Overview

```
Admin creates/edits email in /admin/emails
    ↓
Selects template or starts from scratch
    ↓
Adds/edits sections (hero, text, image, cta, divider, etc.)
    ↓
Reorders sections via drag-and-drop
    ↓
[Preview] - see email with test data
    ↓
[Save Draft] - saves section data to DB (not rendered HTML)
    ↓
[Publish] - combines sections + shell → full_email_html snapshot saved
    ↓
When sending - uses full_email_html directly (no combining on-the-fly)
```

---

## Database Schema

### New `email_sections` Table

```sql
CREATE TABLE email_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  content JSONB DEFAULT '{}',
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_email_sections_template ON email_sections(email_template_id);
```

### Updated `email_templates` Table

```sql
ALTER TABLE email_templates
ADD COLUMN full_email_html TEXT,
ADD COLUMN preview_data JSONB,
ADD COLUMN status TEXT DEFAULT 'draft';
```

---

## Email Block Types (9)

| Section Type | Description | Key Fields |
|--------------|-------------|------------|
| `email_hero` | Full-width image + text overlay | image_url, hero_text, text_color, overlay_position |
| `email_text` | Body text (richtext) | text, text_align |
| `email_image` | Standalone image | image_url, alt_text, link_url |
| `email_cta` | Button | button_text, button_url, button_color |
| `email_divider` | HR line | color, thickness |
| `email_spacer` | Blank space | height |
| `email_social` | Social icons | platforms[], urls[] |
| `email_columns` | 2-column layout | columns[] each with content, gap |
| `email_variable` | Variable placeholder | variable_name (dropdown: name, email, etc.) |

### Variable Dropdown Options
`{{name}}`, `{{email}}`, `{{member_id}}`, `{{membership_tier}}`, `{{renewal_date}}`, `{{grantCycleName}}`, `{{amount}}`, `{{site_url}}`, `{{dashboard_url}}`, `{{perks_url}}`

---

## Component Structure

```
components/
  email-blocks/
    EmailBlockRenderer.tsx    -- Switch statement to render correct block
    EmailHeroBlock.tsx        -- Hero image + overlay
    EmailTextBlock.tsx        -- Body text
    EmailImageBlock.tsx        -- Standalone image
    EmailCtaBlock.tsx          -- CTA button
    EmailDividerBlock.tsx     -- Horizontal rule
    EmailSpacerBlock.tsx      -- Vertical spacing
    EmailSocialBlock.tsx      -- Social icons row
    EmailColumnsBlock.tsx     -- 2-column layout
    EmailVariableBlock.tsx    -- Variable placeholder

  admin/email/
    EmailBuilder.tsx           -- Main builder UI (sections list + editor)
    EmailSectionList.tsx       -- Draggable section list (uses @dnd-kit)
    EmailBlockEditor.tsx       -- Edit section content (FieldEditor pattern)
    EmailPreview.tsx           -- Live preview iframe
    EmailTemplateSelector.tsx  -- Choose starting template
    VariableInserter.tsx       -- Dropdown to insert {{variables}}
```

---

## Implementation Phases

### Phase 1: Database & Foundation
- [x] Create migration: `email_sections` table
- [x] Create migration: Add columns to `email_templates`
- [x] Create `lib/email-blocks/types.ts` with interfaces
- [x] Create `lib/email-blocks/registry.ts` with block definitions

### Phase 2: Block Components
- [x] EmailHeroBlock - image with overlay text
- [x] EmailTextBlock - body text with optional alignment
- [x] EmailImageBlock - image with optional link
- [x] EmailCtaBlock - button with URL
- [x] EmailDividerBlock - HR element
- [x] EmailSpacerBlock - blank space
- [x] EmailSocialBlock - social icons row
- [x] EmailColumnsBlock - 2-column layout
- [x] EmailVariableBlock - variable placeholder
- [x] `EmailBlockRenderer.tsx` - switch statement
- [x] `lib/email-blocks/renderer.ts` - render from content JSON

### Phase 3: Shell & Publishing
- [x] `lib/email-blocks/shell.ts` - NFW fixed shell (header, footer, colors)
- [x] `lib/email-blocks/publish.ts` - Combine sections + shell → full_email_html
- [x] Preview API: `/api/admin/emails/[slug]/preview` renders from sections
- [x] Publish API: `/api/admin/emails/[slug]/publish` generates snapshot

### Phase 4: Admin UI - Builder
- [x] `EmailBuilder.tsx` - main layout (section list + preview)
- [x] `EmailSectionList.tsx` - @dnd-kit drag-and-drop list
- [x] `EmailBlockEditor.tsx` - edit section content with VariableInserter
- [x] Add section button (shows block type picker)
- [x] Delete/reorder sections
- [x] Inline preview toggle
- [x] Save draft / Publish buttons

### Phase 5: Conversion of Existing Templates
- [ ] Write migration script to parse existing `html_content` into sections
- [ ] Split body HTML into appropriate block types
- [ ] Verify published emails still send correctly

---

## Technical Details

### Email-Safe HTML Requirements

Unlike React web components, email HTML must be:
- **Tables for layout** (not flexbox/grid)
- **Inline styles only** (no CSS classes)
- **No JavaScript**
- **Specific image dimensions** (Gmail requires)

### Shell Structure (Fixed NFW)

```html
<!-- Container: 600px wide, dove background -->
<table cellpadding="0" cellspacing="0" border="0" width="600">

  <!-- Header: Logo centered -->
  <tr>
    <td style="padding: 30px; text-align: center; background: #EBEBE8;">
      <img src="nfw-logo.png" alt="NFW" width="200" />
    </td>
  </tr>

  <!-- Dynamic sections inserted here -->
  {{sections}}

  <!-- Footer: Aubergine background, social icons, quote -->
  <tr>
    <td style="background: #3E145F; padding: 40px 30px; text-align: center;">
      <!-- social icons, quote, copyright -->
    </td>
  </tr>

</table>
```

---

## Key Files to Create/Modify

### New Files (Phase 1-4)

| File | Purpose |
|------|---------|
| `supabase/migrations/072_add_email_sections.sql` | email_sections table |
| `supabase/migrations/073_add_email_template_columns.sql` | Add columns to email_templates |
| `lib/email-blocks/types.ts` | Email block interfaces |
| `lib/email-blocks/registry.ts` | Block definitions with editorFields |
| `lib/email-blocks/renderer.ts` | Render blocks to HTML strings |
| `lib/email-blocks/shell.ts` | Fixed NFW shell HTML |
| `lib/email-blocks/publish.ts` | Generate + save full_email_html |
| `components/email-blocks/*.tsx` | 9 block components |
| `components/admin/email/*.tsx` | Builder UI components |
| `app/admin/emails/[id]/EmailBuilderClient.tsx` | Client component |

### Modified Files

| File | Changes |
|------|---------|
| `app/admin/emails/page.tsx` | Add "Edit with Builder" button |
| `app/api/admin/emails/[slug]/route.ts` | Add PUT for status, full_email_html |
| `app/api/admin/emails/[slug]/preview/route.ts` | Render from sections |
| `app/api/admin/emails/[slug]/publish/route.ts` | Publish to snapshot |

---

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| 1 | DB + types + registry | 1-2 days |
| 2 | Block components (9 types) | 3-4 days |
| 3 | Shell + publish logic | 1-2 days |
| 4 | Admin UI + DnD | 3-4 days |
| 5 | Migration script | 1 day |

**Total: ~10-14 days** of development

---

## Dependencies

| Package | Status |
|---------|--------|
| `@dnd-kit/core` | Already installed |
| `@dnd-kit/sortable` | Already installed |
| `@dnd-kit/utilities` | Already installed |

---

## Session Notes

### 2026-05-24: Email Builder Phase 1-4 Complete

**Completed:**
- Database migrations (072, 073, 074) for email_sections table and email_templates columns
- All 9 block types created with email-safe HTML (tables, inline styles)
- `shell.ts` - Fixed NFW branded shell (header, footer, colors)
- `renderer.ts` - Renders sections to HTML strings
- Admin UI with drag-and-drop (EmailSectionList.tsx, EmailBlockEditor.tsx)
- Preview and Publish API routes
- VariableInserter and LinkInserter components
- Added section-level `background_color` field to email_sections

**New block types added after initial 9:**
- `email_double_image_cta` - Two images side by side with buttons below
- `email_single_image_cta` - Full-width image with button below

---

### 2026-05-25: Email Builder Fixes and Improvements

**MediaLibraryModal Fix:**
- Fixed pagination arrow buttons not working - changed effect to always fetch on offset change

**Text Formatting:**
- Added Bold (B) and Italic (I) toolbar buttons to EmailBlockEditor for richtext fields
- Implemented `parseInlineFormatting()` in EmailTextBlock - converts `**bold**` → `<strong>` and `*italic*` → `<em>`

**Button Fixes:**
- Fixed fake pointer cursor on buttons with no URL - now uses plain `<div>` instead of `<a href="#">`
- Fixed link underlines - added `text-decoration: none` to anchor tags
- Changed `vertical-align: middle` to `vertical-align: top` for buttons

**Image CTA Section Fixes:**
- Images: wrapped in `<div>` with fixed height (200px) and `object-fit: cover`
- Buttons: use inner `<div>` with `background-color` instead of `<td>` background (fixes gap issue)
- Added 10px gap below images (padding-top on button wrapper cell)
- Left/right button gap: left cell `padding-right: 10px`, right cell `padding-left: 10px`
- Single image CTA height changed from 300px to 200px to match double image CTA
- Removed `background_color` field from `email_double_image_cta` and `email_single_image_cta` block editors (only section-level background should be used)

**Known Limitations:**
- `object-fit: cover` not reliably supported in email clients (Gmail, Outlook, Apple Mail)
  - Preview shows correctly, but actual email clients may display differently
- Flexbox not email-client compatible for equal-height buttons
- `cursor` styling not reliably supported in email clients

---

## Current Block Types (11 total)

| Section Type | Description | Key Fields |
|--------------|-------------|------------|
| `email_hero` | Full-width image + text overlay | image_url, hero_text, text_color |
| `email_text` | Body text (richtext) | text, text_align |
| `email_image` | Standalone image | image_url, alt_text, link_url |
| `email_cta` | Button | button_text, button_url, button_color |
| `email_divider` | HR line | color, thickness |
| `email_spacer` | Blank space | height |
| `email_social` | Social icons | platforms[], urls[] |
| `email_columns` | 2-column layout | columns[] each with content, gap |
| `email_variable` | Variable placeholder | variable_name |
| `email_double_image_cta` | Two images with buttons below | image1_url, image2_url, button1_text, button2_text, button1_color, button2_color |
| `email_single_image_cta` | Single image with button below | image_url, button_text, button_color |