import { describe, it, expect } from "vitest";
import type { Person } from "./types.js";

describe("Person type", () => {
  it("should accept company field", () => {
    const person: Person = {
      id: 1,
      name: "Test User",
      slug: "test-user",
      imageUrl: null,
      company: "Test Company"
    };
    expect(person.company).toBe("Test Company");
  });

  it("should accept null company", () => {
    const person: Person = {
      id: 1,
      name: "Test User",
      slug: "test-user",
      imageUrl: null,
      company: null
    };
    expect(person.company).toBeNull();
  });
});
