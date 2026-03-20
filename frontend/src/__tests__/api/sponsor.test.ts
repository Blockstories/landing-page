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
