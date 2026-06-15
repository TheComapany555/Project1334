import { describe, it, expect } from "vitest";
import { parseReaxml, mapReaxmlStatus } from "./reaxml";

// The sample from the "Guidelines for Business Listing Data" spec PDF.
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE propertyList SYSTEM "propertyList.dtd">
<propertyList date="2025-10-31" username="your_username" password="your_password">
  <business modTime="2025-10-31T12:00:00" status="current">
    <agentID>AGENT001</agentID>
    <uniqueID>BUS12345</uniqueID>
    <exclusivity value="exclusive"/>
    <commercialListingType value="sale"/>
    <listingAgent id="1">
      <agentID>AGENT001</agentID>
      <name>Jane Smith</name>
      <telephone type="mobile">0412 345 678</telephone>
      <email>jane.smith@example.com</email>
    </listingAgent>
    <price display="yes" tax="unknown" plusSAV="no">500000</price>
    <priceView>$500,000</priceView>
    <businessLease period="month">5000</businessLease>
    <takings>10000</takings>
    <return period="annual" unit="percent">15</return>
    <currentLeaseEndDate>2025-12-31</currentLeaseEndDate>
    <furtherOptions>Option to renew for 5 years</furtherOptions>
    <address display="yes" streetview="yes">
      <streetNumber>123</streetNumber>
      <street>Example Street</street>
      <suburb display="yes">Melbourne</suburb>
      <state>VIC</state>
      <postcode>3000</postcode>
      <country>Australia</country>
    </address>
    <businessCategory id="1">
      <name>Retail</name>
      <businessSubCategory>
        <name>Cafe/Coffee Shop</name>
      </businessSubCategory>
    </businessCategory>
    <headline>Profitable Cafe in Prime Location</headline>
    <description>Well-established cafe with loyal clientele and high foot traffic...</description>
    <terms>Terms and conditions apply.</terms>
    <vendorDetails>
      <name>John Doe</name>
      <telephone type="BH">03 1234 5678</telephone>
      <email>vendor@example.com</email>
    </vendorDetails>
    <externalLink href="http://example.com/more-info"/>
    <images>
      <img id="a" format="jpg" url="http://example.com/image1.jpg"/>
      <img id="b" format="jpg" url="http://example.com/image2.jpg"/>
    </images>
    <purchaseOrder>PO123456</purchaseOrder>
  </business>
</propertyList>`;

describe("parseReaxml", () => {
  it("parses the spec sample into one normalised listing", () => {
    const res = parseReaxml(SAMPLE);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.listings).toHaveLength(1);

    const l = res.listings[0];
    expect(l.title).toBe("Profitable Cafe in Prime Location");
    expect(l.externalId).toBe("BUS12345");
    expect(l.agentId).toBe("AGENT001");
    expect(l.reaxmlStatus).toBe("current");
    expect(l.categoryName).toBe("Retail");
    expect(l.subcategoryName).toBe("Cafe/Coffee Shop");
    expect(l.askingPrice).toBe(500000);
    expect(l.priceType).toBe("fixed");
    expect(l.revenue).toBe(10000); // takings -> revenue
    expect(l.exclusivity).toBe("exclusive");
    expect(l.suburb).toBe("Melbourne");
    expect(l.state).toBe("VIC");
    expect(l.postcode).toBe("3000");
    expect(l.locationText).toBe("123 Example Street, Melbourne, VIC 3000");
  });

  it("composes lease info and folds terms/return into the description", () => {
    const res = parseReaxml(SAMPLE);
    if (!res.ok) throw new Error("parse failed");
    const l = res.listings[0];
    expect(l.leaseDetails).toContain("$5000/month");
    expect(l.leaseDetails).toContain("2025-12-31");
    expect(l.leaseDetails).toContain("renew");
    expect(l.description).toContain("Terms:");
    expect(l.description).toContain("Return: 15%");
  });

  it("keeps vendor details and image urls", () => {
    const res = parseReaxml(SAMPLE);
    if (!res.ok) throw new Error("parse failed");
    const l = res.listings[0];
    expect(l.vendor).toEqual({
      name: "John Doe",
      phone: "03 1234 5678",
      email: "vendor@example.com",
    });
    expect(l.imageUrls).toEqual([
      "http://example.com/image1.jpg",
      "http://example.com/image2.jpg",
    ]);
  });

  it("treats a missing/empty price as POA", () => {
    const xml = SAMPLE.replace(
      '<price display="yes" tax="unknown" plusSAV="no">500000</price>',
      "",
    );
    const res = parseReaxml(xml);
    if (!res.ok) throw new Error("parse failed");
    expect(res.listings[0].priceType).toBe("poa");
    expect(res.listings[0].askingPrice).toBeNull();
  });

  it("handles multiple <business> elements", () => {
    const two = SAMPLE.replace(
      "</business>\n</propertyList>",
      `</business>
  <business modTime="2025-10-31T12:00:00" status="sold">
    <uniqueID>BUS99999</uniqueID>
    <headline>Second Business</headline>
    <businessCategory id="1"><name>Services</name></businessCategory>
  </business>
</propertyList>`,
    );
    const res = parseReaxml(two);
    if (!res.ok) throw new Error("parse failed");
    expect(res.listings).toHaveLength(2);
    expect(res.listings[1].title).toBe("Second Business");
    expect(res.listings[1].reaxmlStatus).toBe("sold");
    expect(res.listings[1].subcategoryName).toBeNull();
  });

  it("rejects non-REAXML and empty input", () => {
    expect(parseReaxml("").ok).toBe(false);
    expect(parseReaxml("<foo/>").ok).toBe(false);
    expect(parseReaxml("not xml <<<").ok).toBe(false);
  });
});

describe("mapReaxmlStatus", () => {
  it("maps current -> draft by default, published when opted in", () => {
    expect(mapReaxmlStatus("current")).toBe("draft");
    expect(mapReaxmlStatus("current", { publishCurrent: true })).toBe("published");
  });
  it("maps sold, withdrawn/offmarket, and skips leased", () => {
    expect(mapReaxmlStatus("sold")).toBe("sold");
    expect(mapReaxmlStatus("withdrawn")).toBe("unpublished");
    expect(mapReaxmlStatus("offmarket")).toBe("unpublished");
    expect(mapReaxmlStatus("leased")).toBe("skip");
  });
  it("defaults missing status to current/draft", () => {
    expect(mapReaxmlStatus(null)).toBe("draft");
  });
});
