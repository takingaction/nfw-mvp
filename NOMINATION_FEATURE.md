# Nomination Feature (TEMPORARILY DISABLED)

**Date Disabled:** 2026-07-23

**Reason:** Removed per business decision - users can now only apply for themselves, not nominate others.

---

## What Was Removed

### Components Modified

#### `components/GrantApplicationForm.tsx`

**State removed:**
```typescript
const [isNominating, setIsNominating] = useState(false);
const [nomineeName, setNomineeName] = useState("");
const [nomineeEmail, setNomineeEmail] = useState("");
```

**Validation removed from handleSubmit:**
```typescript
if (isNominating) {
  if (!nomineeName.trim()) {
    setError("Please enter the nominee's name");
  }
  if (!nomineeEmail.trim()) {
    setError("Please enter the nominee's email");
  }
  if (!emailRegex.test(nomineeEmail.trim())) {
    setError("Please enter a valid email address for the nominee");
  }
  if (!consentChecked) {
    setError("Please confirm the nominee has consented to being nominated");
  }
}
```

**Submission data changed:**
```typescript
// BEFORE:
is_nominating: isNominating,
nominee_name: isNominating ? nomineeName.trim() : null,
nominee_email: isNominating ? nomineeEmail.trim() : null,

// AFTER:
is_nominating: false,
nominee_name: null,
nominee_email: null,
```

**UI elements removed:**
- Toggle buttons: "I'm applying for myself" / "I'm nominating someone"
- Nominee name input field
- Nominee email input field
- Nominee consent checkbox
- Conditional question text based on isNominating

#### `app/api/grants/create/route.ts`

**Validation removed:**
```typescript
// Validate nominee fields when nominating
if (is_nominating) {
  if (!nominee_name || typeof nominee_name !== "string" || nominee_name.trim().length < 1) {
    return NextResponse.json(
      { error: "Please provide the nominee's name" },
      { status: 400 }
    );
  }
  if (!nominee_email || typeof nominee_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nominee_email.trim())) {
    return NextResponse.json(
      { error: "Please provide a valid nominee email address" },
      { status: 400 }
    );
  }
}
```

---

## Database Columns Preserved

The following columns remain in the `grants` table for historical data:

| Column | Type | Description |
|--------|------|-------------|
| `is_nominating` | BOOLEAN | Whether application is a nomination |
| `nominee_name` | TEXT | Name of nominated person |
| `nominee_email` | TEXT | Email of nominated person |

---

## Admin Display (Preserved)

The following files continue to display nomination data for historical applications:

- `components/admin/GrantCombinedScores.tsx`
- `components/admin/GrantApplicationScorer.tsx`
- `components/admin/AdminGrantReviewer.tsx`
- `app/grants/view/[id]/page.tsx`
- `app/grants/my-applications/page.tsx`
- `app/admin/grants/[id]/scoring/first/page.tsx`
- `app/admin/grants/[id]/scoring/second/page.tsx`
- `app/admin/grants/[id]/scoring/combined/page.tsx`
- `app/api/admin/grants/[id]/scores/route.ts`
- `app/api/admin/grants/[id]/scores/first/route.ts`
- `app/api/admin/grants/[id]/scores/second/route.ts`
- `app/api/admin/grants/[id]/scores/combined/route.ts`
- `app/api/admin/grants/[id]/export/route.ts`
- `app/api/admin/grants/send-bank-info-email/route.ts`

---

## To Re-Enable

To bring back the nomination feature:

1. **Restore state in `GrantApplicationForm.tsx`:**
   - Add back `isNominating`, `nomineeName`, `nomineeEmail` state
   - Add back validation logic in handleSubmit
   - Add back toggle buttons, input fields, and consent checkbox
   - Add back conditional question text

2. **Restore validation in `app/api/grants/create/route.ts`:**
   - Add back nominee field validation
   - Add back `is_nominating`, `nominee_name`, `nominee_email` in insert

3. **No database changes needed** - columns are preserved
