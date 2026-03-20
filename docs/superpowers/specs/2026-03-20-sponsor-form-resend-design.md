# Design: Sponsor Form → Resend Email

**Date:** 2026-03-20
**Status:** Approved

## Goal

Wire the "Become a Sponsor" form in `events.astro` to send an email to `luca@blockstories.de` via the Resend API when submitted.

## Architecture

### New files

**`backend/integrations/resend.ts`**
- Exports `sendEmail(to, subject, html, text)` using the `resend` npm SDK
- Reads `RESEND_API_KEY` from `process.env`
- Throws on API error

**`frontend/src/pages/api/sponsor.ts`**
- Astro POST endpoint
- Reads JSON body: `{ name, email, company, interest, message }`
- Validates: `name` and `email` required → 400 if missing
- Calls `sendEmail` with formatted content
- Returns `{ success: true }` on success, `{ error: string }` on failure

### Modified files

**`frontend/src/pages/events.astro`** — sponsor form IIFE
- POST JSON to `/api/sponsor` on submit
- Disable submit button during request
- On success: replace form contents with a success message
- On error: show inline error text below the form

## Email

| Field | Value |
|---|---|
| From | `onboarding@resend.dev` |
| To | `luca@blockstories.de` |
| Subject | `New Sponsor Inquiry – {name} ({company})` |
| Body | HTML email listing all 5 fields: Name, Email, Company, Interested In, Message |

## Validation

- **Required (server-side):** `name`, `email` → 400 if missing
- **Client-side:** disable button on submit; re-enable on error

## Dependencies

- Install `resend` npm package in `frontend/`
- `RESEND_API_KEY` already present in `.env`
