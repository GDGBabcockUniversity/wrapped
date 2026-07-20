import { describe, it, expect } from "vitest";
import { classifyNameSender, type Person } from "./build-mapping";

const POOL: Person[] = [
  { name: "Audrey Okafor", email: "okaforaudrey@gmail.com" },
  { name: "Boluwatife Adeyemi", email: "addisonhackss14@gmail.com" },
  { name: "Bature Emmanuel", email: "batureemmanuel119@gmail.com" },
  { name: "Udemba Chinenyenwa Emmanuel", email: "emmanueludemba59@gmail.com" },
  { name: "Rejoice Emmanuel", email: "emmanuelr5915@student.babcock.edu.ng" },
  { name: "Favour Ajao-Rotimi", email: "favour870487@gmail.com" },
];

describe("classifyNameSender", () => {
  it("accepts phone evidence outright, ignoring name scores", () => {
    const d = classifyNameSender("~ ÆSÏR", POOL, "someone@school.edu");
    expect(d).toEqual({ kind: "phone", email: "someone@school.edu" });
  });

  it("auto-accepts a single dominant candidate", () => {
    const d = classifyNameSender("Audrey", POOL, undefined);
    expect(d.kind).toBe("auto");
    if (d.kind === "auto") expect(d.email).toBe("okaforaudrey@gmail.com");
  });

  it("auto-accepts a discriminating email-local match (Hack13 → addisonhackss)", () => {
    const d = classifyNameSender("Hack", POOL, undefined);
    // "hack" ⊂ "addisonhackss" is the only hit; nothing else matches.
    expect(d.kind).toBe("auto");
    if (d.kind === "auto") expect(d.email).toBe("addisonhackss14@gmail.com");
  });

  it("sends ambiguous single-token names to review (Emma ties three people)", () => {
    const d = classifyNameSender("Emma", POOL, undefined);
    expect(d.kind).toBe("review");
    if (d.kind === "review") expect(d.candidates.length).toBeGreaterThan(1);
  });

  it("sends a no-match nickname to review with no candidates", () => {
    const d = classifyNameSender("Satan", POOL, undefined);
    expect(d.kind).toBe("review");
    if (d.kind === "review") expect(d.candidates).toHaveLength(0);
  });

  it("resolves a hyphenated surname unambiguously", () => {
    const d = classifyNameSender("Ajao-Rotimi", POOL, undefined);
    expect(d.kind).toBe("auto");
    if (d.kind === "auto") expect(d.email).toBe("favour870487@gmail.com");
  });
});
