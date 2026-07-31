import { describe, expect, it } from "vitest";
import { selectRecipients } from "./send-list";

const ALL = ["ada@b.edu", "bola@b.edu", "chidi@b.edu", "dami@b.edu"];

describe("selectRecipients", () => {
  it("mails everyone with a snapshot on a clean run", () => {
    expect(selectRecipients(ALL, new Set())).toEqual(ALL);
  });

  it("skips people already sent to, so a re-run is safe", () => {
    const delivered = new Set(["ada@b.edu", "chidi@b.edu"]);
    expect(selectRecipients(ALL, delivered)).toEqual(["bola@b.edu", "dami@b.edu"]);
  });

  it("sends nothing when everyone has already had theirs", () => {
    expect(selectRecipients(ALL, new Set(ALL))).toEqual([]);
  });

  it("--force sends again to people already done", () => {
    expect(selectRecipients(ALL, new Set(ALL), { force: true })).toEqual(ALL);
  });

  it("--force never reaches an address with no snapshot", () => {
    // The guard that matters: force lifts the delivered filter and nothing
    // else. Somebody not in `all` has no Wrapped to send.
    const delivered = new Set(["ghost@b.edu"]);
    expect(selectRecipients(ALL, delivered, { force: true })).toEqual(ALL);
    expect(selectRecipients(ALL, delivered, { force: true })).not.toContain("ghost@b.edu");
  });

  it("--only narrows to one person", () => {
    expect(selectRecipients(ALL, new Set(), { only: "bola@b.edu" })).toEqual(["bola@b.edu"]);
  });

  it("--only still respects an existing delivery unless forced", () => {
    const delivered = new Set(["bola@b.edu"]);
    expect(selectRecipients(ALL, delivered, { only: "bola@b.edu" })).toEqual([]);
    expect(
      selectRecipients(ALL, delivered, { only: "bola@b.edu", force: true })
    ).toEqual(["bola@b.edu"]);
  });

  it("--only for an address with no snapshot sends nothing", () => {
    expect(selectRecipients(ALL, new Set(), { only: "nobody@b.edu" })).toEqual([]);
  });

  it("--limit caps people who WILL be mailed, not candidates considered", () => {
    // The ordering trap: capping before the delivered filter would make
    // `--limit 2` here mean "look at ada and bola, skip both, send nothing".
    const delivered = new Set(["ada@b.edu", "bola@b.edu"]);
    expect(selectRecipients(ALL, delivered, { limit: 2 })).toEqual([
      "chidi@b.edu",
      "dami@b.edu",
    ]);
  });

  it("--limit 0 sends to nobody", () => {
    expect(selectRecipients(ALL, new Set(), { limit: 0 })).toEqual([]);
  });

  it("a limit above the list size is not an error", () => {
    expect(selectRecipients(ALL, new Set(), { limit: 999 })).toEqual(ALL);
  });
});
