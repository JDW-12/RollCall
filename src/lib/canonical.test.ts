import { describe, expect, it } from "vitest";
import { canonicalHost } from "./canonical";

const prod = { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "rollcall-henna.vercel.app" };

describe("canonicalHost", () => {
  it("forwards an old deployment URL to the production domain", () => {
    expect(canonicalHost({ host: "rollcall-9erc4tsft-team.vercel.app", pathname: "/home" }, prod)).toBe("rollcall-henna.vercel.app");
  });

  it("leaves the production domain, custom domains, API routes and non-production alone", () => {
    expect(canonicalHost({ host: "rollcall-henna.vercel.app", pathname: "/home" }, prod)).toBeNull();
    expect(canonicalHost({ host: "rollcall.app", pathname: "/home" }, prod)).toBeNull();
    expect(canonicalHost({ host: "rollcall-abc.vercel.app", pathname: "/api/stripe/webhook" }, prod)).toBeNull();
    expect(canonicalHost({ host: "rollcall-abc.vercel.app", pathname: "/home" }, { VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "rollcall-henna.vercel.app" })).toBeNull();
    expect(canonicalHost({ host: "localhost:3000", pathname: "/" }, {})).toBeNull();
  });
});
