import { describe, expect, it } from "vitest";
import { canSeeSession, encodeInvitees, inviteesOf, visibleSessions } from "./visibility";

const org = { id: "org", isOrganiser: true };
const priya = { id: "priya", isOrganiser: false };
const tom = { id: "tom", isOrganiser: false };

describe("session visibility", () => {
  it("shows a whole-crew session to everyone", () => {
    const s = { invitees: null, createdBy: "org" };
    expect([org, priya, tom].every((v) => canSeeSession(s, v))).toBe(true);
  });

  it("shows a picked session to the invited, organisers and whoever pinned it, and nobody else", () => {
    const s = { invitees: JSON.stringify(["josh", "priya"]), createdBy: "josh" };
    expect(canSeeSession(s, priya)).toBe(true);
    expect(canSeeSession(s, tom)).toBe(false);
    expect(canSeeSession(s, org)).toBe(true);
    expect(canSeeSession(s, { id: "josh", isOrganiser: false })).toBe(true);
    expect(visibleSessions([s, { invitees: null, createdBy: "josh" }], tom)).toHaveLength(1);
  });

  it("reads a broken invite list as the whole crew rather than hiding the session", () => {
    expect(inviteesOf({ invitees: "not json" })).toBeNull();
    expect(canSeeSession({ invitees: "{}", createdBy: "org" }, tom)).toBe(true);
  });

  it("encodes picks against the member list, keeps anyone who already answered, and needs someone picked", () => {
    const opts = { memberIds: ["org", "priya", "tom", "sam"], creatorId: "org" };
    expect(encodeInvitees("crew", ["priya"], opts)).toBeNull();
    expect(JSON.parse(encodeInvitees("picked", ["tom", "stranger", "org"], { ...opts, responded: ["sam"] })!)).toEqual(["org", "sam", "tom"]);
    expect(() => encodeInvitees("picked", ["org"], opts)).toThrow(/Pick at least one person/);
  });
});
