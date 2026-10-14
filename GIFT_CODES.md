# Gift Codes: Print Batches

Mailed gift-membership cards, one unique single-use code per card, printed as a QR code plus readable text.

## Flow

1. **Admin → Gift Codes → New print batch.** Name (e.g. `Holiday 2026 Mailer`), quantity, tier (Contributing / Founding), membership length in months, optional code expiry date, notes. All codes are generated in one transaction (`create_gift_code_batch`), so a batch either exists in full or not at all.
2. **Printer CSV** on the batch row downloads only codes that are still usable:

   ```csv
   seq,code,redeem_url,batch,tier,expires_on
   "1","K7MP-Q2XR","https://www.nationalfundforwomen.org/redeem?code=K7MPQ2XR","Holiday 2026 Mailer","contributing","December 31, 2027"
   ```

   Tell the printer: *"Variable data print. Generate a QR code from `redeem_url` and print `code` as text below it."* Add name/address columns yourself if the cards are addressed.
3. **The QR opens `/redeem?code=…`**, which shows the gift and then:
   - logged out → *Create my account* (`/auth/sign-up?gift=…`, code pre-filled at step 3, carried through email confirmation and Google sign-in) or *I already have an account* (`/auth/login?next=/redeem?code=…`)
   - logged in, free → *Activate my membership* → `/auth/welcome`
   - logged in, active paid member → nothing redeemed; the card stays usable for someone else
   - invalid / used / voided / expired → clear message
4. **Track** per batch: issued, redeemed (%), available, voided, expired. *Full report* CSV lists every code with status and redeemer.
5. **Void** a single lost card from the code list, or every unredeemed code in a batch (e.g. leftover misprint spares).

## Rules enforced in the database (migration 202)

- `redeem_gift_code()` locks the code row, checks voided / redeemed / expired / already-paid, then marks the code used **and** upgrades the profile in the same transaction. Two people redeeming one code at the same moment: one succeeds, the other gets "already used".
- Codes: 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0, O, 1, I), CSPRNG. Input accepts hyphens, spaces and lowercase.
- Failed lookups are rate-limited: 20 invalid codes per IP per 15 minutes (`gift_code_lookup_failures`, hashed IPs).
- All gift tables and functions are service-role only (RLS on, no policies; EXECUTE revoked from `anon`/`authenticated`).

## Printing tips

- Order a small proof run and scan every card before the full order.
- Generate 5–10% extra; void the spares after printing.
- Unredeemed codes are like cash. Send the CSV to the printer through a secure upload, not an open email attachment.
- Generate real batches on production. Codes only exist in the database they were created in, and `redeem_url` is built from `NEXT_PUBLIC_SITE_URL` (falls back to `https://www.nationalfundforwomen.org`), so check that variable on staging before testing a printed proof there.
