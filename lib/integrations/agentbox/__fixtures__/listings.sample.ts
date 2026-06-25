/**
 * Sample Agentbox listing responses for local development + the mapper unit test.
 *
 * Because the live Agentbox sandbox is IP-restricted (we can't call it or open
 * the docs until Reapit whitelists our IP), this fixture lets the WHOLE flow —
 * map → upsert → drafts in the UI — be built and verified now. Set
 * `AGENTBOX_USE_FIXTURES=1` to make the adapter return these instead of calling
 * the network. Replace/extend with a real recorded response once whitelisted.
 *
 * Shapes are modelled on the documented Agentbox listing resource; field paths
 * are isolated in ../map.ts so adjusting them later is a one-file change.
 */

import type { AgentboxRawListing } from "../map";

export const sampleAgentboxListings: AgentboxRawListing[] = [
  {
    id: "AB-1001",
    type: "Business",
    marketingStatus: "Available",
    mainHeadline: "Profitable CBD Café — Established 12 Years",
    description: "Long-established café in a prime Sydney CBD location with strong foot traffic.",
    searchPrice: 285000,
    annualTurnover: 640000,
    modified: "2026-06-20T03:15:00Z",
    listingAgent: { id: "STAFF-7", name: "Jane Broker" },
    property: {
      type: "Business",
      category: "Food/Hospitality",
      subCategory: "Cafe/Coffee Shop",
      address: { suburb: "Sydney", state: "nsw", postcode: "2000" },
    },
    vendor: { name: "Acme Holdings Pty Ltd", phone: "0400 000 111", email: "vendor@example.com" },
    images: {
      items: [
        { url: "https://images.example.com/ab-1001/1.jpg" },
        { url: "https://images.example.com/ab-1001/2.jpg" },
      ],
    },
  },
  {
    id: "AB-1002",
    type: "Business",
    marketingStatus: "Under Offer",
    mainHeadline: "Established Automotive Mechanical Workshop",
    description: "Well-equipped mechanical repair workshop with a loyal customer base.",
    price: "$420,000",
    modified: "2026-06-18T22:40:00Z",
    listingAgent: { id: "STAFF-3" },
    property: {
      type: "Business",
      category: "Automotive",
      subCategory: "Mechanical Repair",
      address: { displayAddress: "12 Industrial Ave, Dandenong VIC 3175", suburb: "Dandenong", state: "VIC", postcode: "3175" },
    },
    images: [{ url: "https://images.example.com/ab-1002/1.jpg" }],
  },
  {
    id: "AB-1003",
    type: "Business",
    marketingStatus: "Sold",
    mainHeadline: "Suburban Newsagency & Tatts",
    searchPrice: 0,
    modified: "2026-05-30T10:00:00Z",
    property: {
      type: "Business",
      category: "Retail",
      subCategory: "Newsagency/Tatts",
      address: { suburb: "Geelong", state: "VIC", postcode: "3220" },
    },
  },
  {
    id: "AB-1004",
    type: "Business",
    marketingStatus: "Leased",
    mainHeadline: "Retail tenancy (lease only — should be skipped)",
    property: { type: "Business", category: "Retail", address: { suburb: "Perth", state: "WA", postcode: "6000" } },
  },
];

export default sampleAgentboxListings;
