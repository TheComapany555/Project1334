import { describe, it, expect } from "vitest";
import { mapAgentboxListing, mapAgentboxStatus } from "./map";
import { sampleAgentboxListings } from "./__fixtures__/listings.sample";

describe("mapAgentboxStatus", () => {
  it("maps available → draft (or published when publishCurrent)", () => {
    expect(mapAgentboxStatus("Available")).toBe("draft");
    expect(mapAgentboxStatus("Available", { publishCurrent: true })).toBe("published");
    expect(mapAgentboxStatus("current")).toBe("draft");
  });

  it("maps under-offer variants → under_offer", () => {
    expect(mapAgentboxStatus("Under Offer")).toBe("under_offer");
    expect(mapAgentboxStatus("under_contract")).toBe("under_offer");
    expect(mapAgentboxStatus("Conditional")).toBe("under_offer");
  });

  it("maps sold/settled → sold and withdrawn/offmarket → unpublished", () => {
    expect(mapAgentboxStatus("Sold")).toBe("sold");
    expect(mapAgentboxStatus("Settled")).toBe("sold");
    expect(mapAgentboxStatus("Withdrawn")).toBe("unpublished");
    expect(mapAgentboxStatus("OffMarket")).toBe("unpublished");
  });

  it("skips leased and defaults unknown → draft", () => {
    expect(mapAgentboxStatus("Leased")).toBe("skip");
    expect(mapAgentboxStatus("something-new")).toBe("draft");
    expect(mapAgentboxStatus(null)).toBe("draft");
  });
});

describe("mapAgentboxListing", () => {
  it("maps a full available business listing", () => {
    const l = mapAgentboxListing(sampleAgentboxListings[0]);
    expect(l.externalId).toBe("AB-1001");
    expect(l.title).toBe("Profitable CBD Café — Established 12 Years");
    expect(l.categoryName).toBe("Food/Hospitality");
    expect(l.subcategoryName).toBe("Cafe/Coffee Shop");
    expect(l.askingPrice).toBe(285000);
    expect(l.priceType).toBe("fixed");
    expect(l.revenue).toBe(640000);
    expect(l.suburb).toBe("Sydney");
    expect(l.state).toBe("NSW"); // upper-cased from "nsw"
    expect(l.postcode).toBe("2000");
    expect(l.agentId).toBe("STAFF-7");
    expect(l.modTime).toBe("2026-06-20T03:15:00Z");
    expect(l.vendor).toEqual({ name: "Acme Holdings Pty Ltd", phone: "0400 000 111", email: "vendor@example.com" });
    expect(l.imageUrls).toHaveLength(2);
    expect(l.status).toBe("draft");
  });

  it("parses a '$420,000' string price and an array images shape", () => {
    const l = mapAgentboxListing(sampleAgentboxListings[1]);
    expect(l.askingPrice).toBe(420000);
    expect(l.priceType).toBe("fixed");
    expect(l.status).toBe("under_offer");
    expect(l.imageUrls).toEqual(["https://images.example.com/ab-1002/1.jpg"]);
    expect(l.locationText).toBe("12 Industrial Ave, Dandenong VIC 3175");
  });

  it("treats a 0 / missing price as POA", () => {
    const l = mapAgentboxListing(sampleAgentboxListings[2]);
    expect(l.askingPrice).toBe(0);
    expect(l.priceType).toBe("poa");
    expect(l.status).toBe("sold");
    expect(l.imageUrls).toEqual([]);
    expect(l.vendor).toBeNull();
  });

  it("flags leased listings as skip", () => {
    const l = mapAgentboxListing(sampleAgentboxListings[3]);
    expect(l.status).toBe("skip");
  });

  it("respects publishCurrent for available listings", () => {
    const l = mapAgentboxListing(sampleAgentboxListings[0], { publishCurrent: true });
    expect(l.status).toBe("published");
  });
});
