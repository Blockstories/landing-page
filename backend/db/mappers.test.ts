import { describe, it, expect } from "vitest";
import { mapRowToPerson } from "./mappers.js";
import type { Row } from "@libsql/client";

describe("mapRowToPerson", () => {
  it("should map company field from row", () => {
    const row = {
      id: 1,
      name: "John Doe",
      slug: "john-doe",
      image_url: "https://example.com/image.jpg",
      company: "Acme Inc",
    } as unknown as Row;

    const person = mapRowToPerson(row);

    expect(person.company).toBe("Acme Inc");
  });

  it("should handle null company", () => {
    const row = {
      id: 1,
      name: "John Doe",
      slug: "john-doe",
      image_url: "https://example.com/image.jpg",
      company: null,
    } as unknown as Row;

    const person = mapRowToPerson(row);

    expect(person.company).toBeNull();
  });

  it("should handle undefined company", () => {
    const row = {
      id: 1,
      name: "John Doe",
      slug: "john-doe",
      image_url: "https://example.com/image.jpg",
    } as unknown as Row;

    const person = mapRowToPerson(row);

    expect(person.company).toBeNull();
  });
});
