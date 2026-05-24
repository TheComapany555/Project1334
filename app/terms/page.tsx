import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicHeader } from "@/components/public-header";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your access to and use of the Salebiz marketplace, including broker, agency, and buyer responsibilities.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "21 April 2026";
const EFFECTIVE_DATE = "21 April 2026";

const sections: LegalSection[] = [
  {
    id: "about",
    number: "01",
    title: "About the Salebiz Platform",
    content: (
      <>
        <p>
          Salebiz is an online technology platform designed to connect verified
          business brokers with potential buyers of businesses. The Platform
          allows:
        </p>
        <ul>
          <li>Verified brokers to list businesses for sale</li>
          <li>Buyers to browse available listings</li>
          <li>Buyers to contact brokers</li>
          <li>Brokers to manage client communications</li>
          <li>Buyers to sign digital Non-Disclosure Agreements (NDAs)</li>
          <li>Storage of messages, documents, and listing materials</li>
          <li>Access to listing analytics and reporting</li>
        </ul>
        <p>
          Salebiz provides technology services only. Salebiz does not act as a
          broker or agent, provide financial or legal advice, participate in
          negotiations, or guarantee business sales. All transactions occur
          directly between brokers and buyers.
        </p>
      </>
    ),
  },
  {
    id: "acceptance",
    number: "02",
    title: "Acceptance of terms",
    content: (
      <>
        <p>By:</p>
        <ul>
          <li>Creating an account</li>
          <li>Accessing the Platform</li>
          <li>Browsing listings</li>
          <li>Uploading content</li>
          <li>Signing NDAs</li>
          <li>Communicating through the Platform</li>
        </ul>
        <p>
          you agree to these Terms. If you do not agree, you must immediately
          stop using the Platform.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    number: "03",
    title: "Eligibility to use the Platform",
    content: (
      <>
        <p>You must:</p>
        <ul>
          <li>Be at least 18 years old</li>
          <li>Provide accurate information</li>
          <li>Use the Platform lawfully</li>
          <li>Not impersonate any person</li>
        </ul>
        <p>Brokers must:</p>
        <ul>
          <li>Be legally authorised to act as brokers</li>
          <li>Maintain any required licences</li>
          <li>Provide verification documents when requested</li>
        </ul>
        <p>
          Salebiz reserves the right to verify user identity, request
          supporting documentation, refuse access, or suspend accounts at its
          sole discretion.
        </p>
      </>
    ),
  },
  {
    id: "broker-obligations",
    number: "04",
    title: "Broker verification and responsibilities",
    content: (
      <>
        <p>Only verified brokers may list businesses on Salebiz.</p>
        <p>Brokers are solely responsible for:</p>
        <ul>
          <li>Listing accuracy</li>
          <li>Financial information</li>
          <li>Images and documents</li>
          <li>Marketing statements</li>
          <li>Legal compliance</li>
          <li>Representations made to buyers</li>
        </ul>
        <p>
          Brokers warrant that all listing information is true, accurate, not
          misleading, and complies with all applicable laws. Salebiz does not
          independently verify listing information and accepts no responsibility
          for inaccurate listings, misleading content, or financial
          misrepresentation. All liability rests with the listing broker.
        </p>
      </>
    ),
  },
  {
    id: "buyer-obligations",
    number: "05",
    title: "Buyer responsibilities",
    content: (
      <>
        <p>Buyers agree to:</p>
        <ul>
          <li>Use the Platform responsibly</li>
          <li>Provide truthful information</li>
          <li>Respect confidentiality</li>
          <li>Comply with signed NDAs</li>
          <li>Use information only for legitimate purposes</li>
        </ul>
        <p>Buyers must not:</p>
        <ul>
          <li>Copy confidential business materials</li>
          <li>Share protected information</li>
          <li>Attempt to bypass brokers</li>
          <li>Misuse listing content</li>
        </ul>
        <p>Violation may result in account suspension or legal action.</p>
      </>
    ),
  },
  {
    id: "ndas",
    number: "06",
    title: "Non-Disclosure Agreements (NDAs)",
    content: (
      <>
        <p>
          Certain listing information may require buyers to sign a
          Non-Disclosure Agreement. By signing an NDA, users agree to:
        </p>
        <ul>
          <li>Maintain confidentiality</li>
          <li>Use information solely for evaluation</li>
          <li>Not disclose information to third parties</li>
          <li>Protect confidential business data</li>
        </ul>
        <p>
          Signed NDAs are legally binding, stored electronically, and may be
          used as legal evidence. Failure to comply may result in legal
          enforcement.
        </p>
      </>
    ),
  },
  {
    id: "listings",
    number: "07",
    title: "Listings and content",
    content: (
      <p>
        Brokers control their listings. Salebiz reserves the right to review,
        modify, remove, or reject listings at its discretion. Listings must be
        truthful, accurate, not misleading, and comply with applicable laws.
        Salebiz does not guarantee listing success, buyer engagement, or
        transaction completion.
      </p>
    ),
  },
  {
    id: "payments",
    number: "08",
    title: "Fees and payments",
    content: (
      <>
        <p>
          Salebiz charges fees only to brokers. Buyers are not charged fees to
          browse listings or contact brokers through the Platform. All broker
          payments must be conducted through the official website at{" "}
          <a href="https://www.salebiz.com.au">salebiz.com.au</a>.
        </p>
        <p>Broker fees may include:</p>
        <ul>
          <li>Monthly subscription fees</li>
          <li>Per-listing fees</li>
          <li>Featured listing fees</li>
          <li>Promotional upgrade fees</li>
        </ul>
        <p>
          All fees must be paid, are processed through the Salebiz website, are
          non-refundable except where required by law, and may be changed from
          time to time. Failure to pay required fees may result in suspension of
          broker accounts, removal of listings, or restricted platform access.
        </p>
        <p>
          Salebiz does not handle payments related to the sale of businesses
          between brokers and buyers. All transaction payments between brokers
          and buyers occur independently of Salebiz.
        </p>
      </>
    ),
  },
  {
    id: "transaction-disclaimer",
    number: "09",
    title: "Platform transaction disclaimer",
    content: (
      <>
        <p>
          Salebiz is not a party to any business sale transaction between
          brokers and buyers. Salebiz does not handle sale funds, provide escrow
          services, guarantee transactions, or verify transaction completion.
          All negotiations, agreements, and payments relating to the sale of
          businesses occur directly between brokers and buyers.
        </p>
        <p>
          Salebiz accepts no responsibility for transaction disputes, failed
          transactions, financial losses, or buyer or broker conduct.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "10",
    title: "Acceptable use",
    content: (
      <>
        <p>Users must not:</p>
        <ul>
          <li>Upload false or misleading listings</li>
          <li>Attempt unauthorised access</li>
          <li>Interfere with Platform systems</li>
          <li>Use automated scraping tools</li>
          <li>Upload malicious software</li>
          <li>Abuse messaging features</li>
        </ul>
        <p>
          Violation may result in immediate suspension, permanent termination,
          or legal enforcement.
        </p>
      </>
    ),
  },
  {
    id: "messaging",
    number: "11",
    title: "Messaging and communication",
    content: (
      <p>
        Salebiz enables communication between users. Users are responsible for
        message content, professional conduct, and accuracy of communication.
        Messages may be stored for security, legal, and operational purposes.
      </p>
    ),
  },
  {
    id: "ip",
    number: "12",
    title: "Intellectual property",
    content: (
      <p>
        All Platform materials, including software, design, branding,
        databases, and system architecture, remain the property of THE COMPANY
        MARKETING PTY LTD. Users retain ownership of uploaded content; however,
        users grant Salebiz a licence to store content, display listings,
        promote listings, and operate the Platform.
      </p>
    ),
  },
  {
    id: "data-storage",
    number: "13",
    title: "Data storage and security",
    content: (
      <p>
        Salebiz stores user data, listings, messages, documents, and NDAs using
        Supabase and related secure cloud technologies. While reasonable
        security measures are used, no system is completely secure. Users
        accept inherent technology risks.
      </p>
    ),
  },
  {
    id: "analytics",
    number: "14",
    title: "Analytics and reporting",
    content: (
      <p>
        Salebiz provides analytics tools which may include listing views, buyer
        interactions, and engagement metrics. Analytics are informational only,
        may not be exact, and do not guarantee outcomes.
      </p>
    ),
  },
  {
    id: "availability",
    number: "15",
    title: "Platform availability",
    content: (
      <p>
        Salebiz does not guarantee continuous operation, uninterrupted service,
        or error-free functionality. Maintenance may occur at any time.
      </p>
    ),
  },
  {
    id: "liability",
    number: "16",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          To the maximum extent permitted by law, Salebiz is not liable for:
        </p>
        <ul>
          <li>Loss of profits</li>
          <li>Business losses</li>
          <li>Data loss</li>
          <li>Listing inaccuracies</li>
          <li>Buyer or broker behaviour</li>
          <li>Failed transactions</li>
        </ul>
        <p>Use of the Platform is at your own risk.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    number: "17",
    title: "Indemnity",
    content: (
      <p>
        Users agree to indemnify Salebiz against claims, losses, damages, and
        legal costs resulting from breach of these Terms, misuse of the
        Platform, or false listings.
      </p>
    ),
  },
  {
    id: "termination",
    number: "18",
    title: "Suspension and termination",
    content: (
      <p>
        Salebiz may suspend or terminate accounts if Terms are breached, fraud
        is suspected, payment obligations are unmet, or illegal conduct occurs.
        Access may be removed without notice.
      </p>
    ),
  },
  {
    id: "third-parties",
    number: "19",
    title: "Third-party services",
    content: (
      <>
        <p>Salebiz relies on third-party services, which may include:</p>
        <ul>
          <li>Cloud storage providers</li>
          <li>Payment processors</li>
          <li>Analytics tools</li>
        </ul>
        <p>Salebiz is not liable for third-party failures.</p>
      </>
    ),
  },
  {
    id: "platform-changes",
    number: "20",
    title: "Changes to the Platform",
    content: (
      <p>
        Salebiz may add new features, remove features, or modify services at
        any time.
      </p>
    ),
  },
  {
    id: "changes",
    number: "21",
    title: "Changes to terms",
    content: (
      <p>
        Salebiz may update these Terms. Updated Terms become effective once
        published. Continued use means acceptance.
      </p>
    ),
  },
  {
    id: "governing-law",
    number: "22",
    title: "Governing law",
    content: (
      <p>
        These Terms are governed by the laws of New South Wales, Australia. All
        disputes are subject to the courts of New South Wales.
      </p>
    ),
  },
  {
    id: "international",
    number: "23",
    title: "International use",
    content: (
      <p>
        Salebiz may operate internationally. Users outside Australia must
        comply with local laws and accept Australian jurisdiction.
      </p>
    ),
  },
  {
    id: "contact",
    number: "24",
    title: "Contact information",
    content: (
      <>
        <p>Legal enquiries:</p>
        <ul>
          <li>
            <strong>THE COMPANY MARKETING PTY LTD</strong>
          </li>
          <li>
            <strong>Address:</strong> 7/24 Hickson Rd, Millers Point NSW 2000,
            Australia
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:legal@salebiz.com.au">legal@salebiz.com.au</a>
          </li>
        </ul>
      </>
    ),
  },
];

export default async function TermsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background" id="top">
      <PublicHeader session={session} variant="compact" />
      <LegalDocument
        title="Terms & Conditions"
        subtitle="The rules that govern your access to and use of the Salebiz platform, operated by THE COMPANY MARKETING PTY LTD."
        lastUpdated={LAST_UPDATED}
        effectiveDate={EFFECTIVE_DATE}
        intro={
          <p>
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access
            to and use of the Salebiz platform (&ldquo;Platform&rdquo;) operated
            by <strong>THE COMPANY MARKETING PTY LTD</strong>{" "}
            (&ldquo;Salebiz&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;), 7/24 Hickson Rd, Millers Point NSW 2000,
            Australia. By accessing or using the Platform, you agree to be
            legally bound by these Terms. If you do not agree, you must not use
            the Platform.
          </p>
        }
        sections={sections}
        related={{ href: "/privacy", label: "Privacy Policy" }}
        contactEmail="legal@salebiz.com.au"
      />
    </div>
  );
}
