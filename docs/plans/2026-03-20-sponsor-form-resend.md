# Sponsor Form → Resend Email Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the "Become a Sponsor" form in `events.astro` to send an email to `luca@blockstories.de` via the Resend API when submitted.

**Architecture:** Install the `resend` npm SDK, create a thin `backend/integrations/resend.ts` helper (matching `beehiiv.ts` pattern), expose an Astro POST endpoint at `/api/sponsor` that validates and sends the email, then replace the stub IIFE in `events.astro` with a real `fetch` call.

**Tech Stack:** Resend SDK (`resend` npm package), Astro API routes, Vitest for API route unit tests.

---

### Task 1: Install resend SDK

**Files:**
- Modify: `package.json` (root)

**Step 1: Install the package**

Run from project root (`/Users/luca/Coding/Blockstories/landing-page/`):
```bash
npm install resend
```

Expected: `package.json` now lists `"resend": "^x.y.z"` under `dependencies`.

**Step 2: Verify install**

```bash
node -e "import('resend').then(m => console.log('ok:', Object.keys(m)))"
```

Expected output contains `ok:` with module exports (includes `Resend`).

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install resend sdk"
```

---

### Task 2: Create Resend integration helper

**Files:**
- Create: `backend/integrations/resend.ts`

**Step 1: Create the file**

```typescript
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: 'Blockstories <onboarding@resend.dev>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
```

**Step 2: Verify TypeScript compiles (no errors)**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds (exit 0) or shows no TypeScript errors related to this file.

**Step 3: Commit**

```bash
git add backend/integrations/resend.ts
git commit -m "feat: add resend integration helper"
```

---

### Task 3: TDD — Create /api/sponsor endpoint

**Files:**
- Create: `frontend/src/__tests__/api/sponsor.test.ts`
- Create: `frontend/src/pages/api/sponsor.ts`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/api/sponsor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the resend integration before importing the handler
vi.mock("../../../../backend/integrations/resend.js", () => ({
  sendEmail: vi.fn(),
}));

import { POST } from "../../pages/api/sponsor.js";
import * as resendModule from "../../../../backend/integrations/resend.js";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/sponsor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callHandler(body: unknown) {
  const response = await POST({ request: makeRequest(body) } as any);
  const json = await response.json();
  return { status: response.status, json };
}

describe("POST /api/sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if name is missing", async () => {
    const { status, json } = await callHandler({ email: "a@b.com" });
    expect(status).toBe(400);
    expect(json.error).toMatch(/name/i);
  });

  it("returns 400 if email is missing", async () => {
    const { status, json } = await callHandler({ name: "Alice" });
    expect(status).toBe(400);
    expect(json.error).toMatch(/email/i);
  });

  it("calls sendEmail with correct recipient and subject on success", async () => {
    vi.mocked(resendModule.sendEmail).mockResolvedValue(undefined);
    await callHandler({
      name: "Alice",
      email: "alice@example.com",
      company: "Acme",
      interest: "event-sponsorship",
      message: "Hello",
    });
    expect(resendModule.sendEmail).toHaveBeenCalledOnce();
    const call = vi.mocked(resendModule.sendEmail).mock.calls[0][0];
    expect(call.to).toBe("luca@blockstories.de");
    expect(call.subject).toContain("Alice");
    expect(call.subject).toContain("Acme");
  });

  it("returns 200 with success:true when email sends", async () => {
    vi.mocked(resendModule.sendEmail).mockResolvedValue(undefined);
    const { status, json } = await callHandler({
      name: "Alice",
      email: "alice@example.com",
    });
    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 500 if sendEmail throws", async () => {
    vi.mocked(resendModule.sendEmail).mockRejectedValue(new Error("API down"));
    const { status, json } = await callHandler({
      name: "Alice",
      email: "alice@example.com",
    });
    expect(status).toBe(500);
    expect(json.error).toBeTruthy();
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm test 2>&1 | grep -A 3 "sponsor"
```

Expected: 5 tests fail with errors like "Cannot find module" or "POST is not a function".

**Step 3: Create the API route**

Create `frontend/src/pages/api/sponsor.ts`:

```typescript
import type { APIRoute } from "astro";
import { sendEmail } from "../../../../backend/integrations/resend.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, company, interest, message } = body;

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const html = [
      '<h2>New Sponsor Inquiry</h2>',
      '<table cellpadding="8" style="font-family:sans-serif;font-size:14px">',
      `<tr><td><strong>Name</strong></td><td>${name}</td></tr>`,
      `<tr><td><strong>Email</strong></td><td>${email}</td></tr>`,
      `<tr><td><strong>Company</strong></td><td>${company || '—'}</td></tr>`,
      `<tr><td><strong>Interested In</strong></td><td>${interest || '—'}</td></tr>`,
      `<tr><td><strong>Message</strong></td><td style="white-space:pre-wrap">${message || '—'}</td></tr>`,
      '</table>',
    ].join('');

    await sendEmail({
      to: "luca@blockstories.de",
      subject: `New Sponsor Inquiry – ${name} (${company || 'no company'})`,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[API] Sponsor form error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Step 4: Run tests to confirm all pass**

```bash
npm test 2>&1 | grep -E "(PASS|FAIL|sponsor|✓|×)"
```

Expected: 5 sponsor tests pass. All existing tests still pass.

**Step 5: Commit**

```bash
git add frontend/src/__tests__/api/sponsor.test.ts frontend/src/pages/api/sponsor.ts
git commit -m "feat: add /api/sponsor endpoint with resend integration"
```

---

### Task 4: Wire events.astro form IIFE

**Files:**
- Modify: `frontend/src/pages/events.astro:879-891`

**Step 1: Replace stub IIFE with real fetch handler**

The current IIFE is at lines 879–891. Replace this exact block:

```javascript
// ═══ Sponsor Form ═══
(function(){
  const form=document.getElementById('sponsorForm');
  if(!form)return;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    const btn=form.querySelector('.sf-submit');
    const orig=btn.textContent;
    btn.textContent='Inquiry Sent!';
    btn.style.background='var(--green)';
    setTimeout(()=>{btn.textContent=orig;btn.style.background=''},3000);
  });
})();
```

With:

```javascript
// ═══ Sponsor Form ═══
(function(){
  const form=document.getElementById('sponsorForm');
  if(!form)return;
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    const btn=form.querySelector('.sf-submit');
    const origText=btn.textContent;
    btn.disabled=true;
    btn.textContent='Sending\u2026';
    const body={
      name:(document.getElementById('sf-name')).value,
      email:(document.getElementById('sf-email')).value,
      company:(document.getElementById('sf-company')).value,
      interest:(document.getElementById('sf-interest')).value,
      message:(document.getElementById('sf-message')).value
    };
    function showError(msg){
      let errEl=form.querySelector('.sf-error');
      if(!errEl){
        errEl=document.createElement('p');
        errEl.className='sf-error';
        errEl.style.cssText='color:#f87171;font-size:.75rem;margin-top:8px';
        form.appendChild(errEl);
      }
      errEl.textContent=msg;
    }
    try{
      const res=await fetch('/api/sponsor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){
        const success=document.createElement('p');
        success.style.cssText='color:var(--green);font-family:var(--body);font-size:.9rem;padding:8px 0';
        success.textContent="Thanks! We'll send you the full partnership deck within 24 hours.";
        form.replaceWith(success);
      } else {
        const data=await res.json();
        btn.disabled=false;btn.textContent=origText;
        showError(data.error||'Something went wrong. Please try again.');
      }
    } catch {
      btn.disabled=false;btn.textContent=origText;
      showError('Network error. Please try again.');
    }
  });
})();
```

**Step 2: Build to verify no errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build completes successfully (exit 0).

**Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass (no regressions).

**Step 4: Commit**

```bash
git add frontend/src/pages/events.astro
git commit -m "feat: wire sponsor form to /api/sponsor endpoint"
```

---

## Environment Notes

- `RESEND_API_KEY` is already set in `frontend/.env`
- Resend's `onboarding@resend.dev` sender works without domain verification (sandbox)
- Project root: `/Users/luca/Coding/Blockstories/landing-page/`
- Test command: `npm test` (runs `vitest run --root backend` — picks up all `*.test.ts` files)
- Build command: `npm run build`
- No separate `frontend/package.json` — single `package.json` at project root
