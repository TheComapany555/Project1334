import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicHeader } from "@/components/public-header";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Salebiz collects, uses, stores, and protects your personal information in accordance with the Australian Privacy Principles.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "21 April 2026";
const EFFECTIVE_DATE = "21 April 2026";

const sections: LegalSection[] = [
  {
    id: "company-details",
    number: "01",
    title: "Company details",
    content: (
      <>
        <p>
          <strong>THE COMPANY MARKETING PTY LTD</strong>
        </p>
        <ul>
          <li>
            <strong>Trading Name:</strong> Salebiz
          </li>
          <li>
            <strong>Address:</strong> 7/24 Hickson Rd, Millers Point NSW 2000,
            Australia
          </li>
          <li>
            <strong>Privacy Contact Email:</strong>{" "}
            <a href="mailto:privacy@salebiz.com.au">privacy@salebiz.com.au</a>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "information-we-collect",
    number: "02",
    title: "Types of personal information collected",
    content: (
      <>
        <p>
          Salebiz collects personal information necessary to operate the
          Platform and provide services to users. Personal information collected
          may include:
        </p>
        <p>
          <strong>Identity Information</strong>
        </p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Residential or business address</li>
          <li>Business or agency name</li>
          <li>Professional licence details</li>
          <li>Identification documents provided for verification</li>
        </ul>
        <p>
          <strong>Account Information</strong>
        </p>
        <ul>
          <li>Username</li>
          <li>Password (stored in encrypted form)</li>
          <li>Profile information</li>
          <li>Account settings</li>
          <li>Login activity</li>
        </ul>
        <p>
          <strong>Broker Information</strong>
        </p>
        <ul>
          <li>Business listing details</li>
          <li>Agency details</li>
          <li>Professional credentials</li>
          <li>
            Listing content, uploaded documents, images, and business
            descriptions
          </li>
          <li>Financial summary information</li>
        </ul>
        <p>
          <strong>Buyer Information</strong>
        </p>
        <ul>
          <li>Contact details and communication history</li>
          <li>Buyer preferences</li>
          <li>Signed Non-Disclosure Agreements</li>
          <li>Access permissions</li>
        </ul>
        <p>
          <strong>Communication Data</strong>
        </p>
        <ul>
          <li>Messages sent through the Platform</li>
          <li>Attachments, uploaded files, and communication history</li>
        </ul>
        <p>
          <strong>Payment Information</strong>
        </p>
        <ul>
          <li>
            Billing information, payment history, subscription details, and
            transaction records
          </li>
          <li>
            Full payment card details are not stored by Salebiz — payment
            processing is handled through secure third-party payment systems.
          </li>
        </ul>
        <p>
          <strong>Technical and Usage Information</strong>
        </p>
        <ul>
          <li>
            IP address, device information, browser type, and operating system
          </li>
          <li>Access times, platform usage activity, and session data</li>
        </ul>
        <p>
          <strong>Analytics Information</strong>
        </p>
        <ul>
          <li>
            Listing views, buyer interactions, user engagement, and platform
            performance data
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "methods-of-collection",
    number: "03",
    title: "Methods of collection",
    content: (
      <>
        <p>
          Personal information is collected directly and indirectly through user
          interaction with the Platform. Information may be collected:
        </p>
        <ul>
          <li>When users create accounts</li>
          <li>When brokers upload listings</li>
          <li>When buyers contact brokers</li>
          <li>When NDAs are signed</li>
          <li>When files are uploaded</li>
          <li>When messages are sent</li>
          <li>When subscriptions are purchased</li>
          <li>When users browse the Platform</li>
          <li>Through cookies and tracking technologies</li>
        </ul>
      </>
    ),
  },
  {
    id: "purpose-of-collection",
    number: "04",
    title: "Purpose of collection",
    content: (
      <>
        <p>
          Salebiz collects personal information to operate and maintain the
          Platform. Personal information is used to:
        </p>
        <ul>
          <li>Create and manage user accounts</li>
          <li>Verify broker identity</li>
          <li>Publish and manage listings</li>
          <li>Facilitate communication between users</li>
          <li>Manage client interactions</li>
          <li>Enable NDA signing workflows</li>
          <li>Process payments</li>
          <li>Provide analytics services</li>
          <li>Improve platform performance</li>
          <li>Maintain platform security</li>
          <li>Detect and prevent fraud</li>
          <li>Enforce legal rights</li>
          <li>Comply with legal obligations</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    number: "05",
    title: "Use of personal information",
    content: (
      <>
        <p>Personal information may be used for:</p>
        <ul>
          <li>Providing Platform services</li>
          <li>Managing user accounts</li>
          <li>Facilitating communication</li>
          <li>Monitoring usage activity</li>
          <li>Responding to enquiries</li>
          <li>Improving platform features</li>
          <li>Maintaining operational records</li>
          <li>Providing service notifications</li>
          <li>Enforcing contractual rights</li>
        </ul>
        <p>Salebiz does not sell personal information to third parties.</p>
      </>
    ),
  },
  {
    id: "disclosure",
    number: "06",
    title: "Disclosure of personal information",
    content: (
      <>
        <p>
          Salebiz may disclose personal information to third parties where
          necessary to operate the Platform. This may include disclosure to:
        </p>
        <p>
          <strong>Service Providers</strong> — including cloud storage
          providers, hosting providers, payment processors, analytics providers,
          email delivery services, and security providers. Platform
          infrastructure may utilise services including Supabase and associated
          cloud technologies.
        </p>
        <p>
          <strong>Legal Requirements</strong> — personal information may be
          disclosed where required by law, court order, to regulatory
          authorities, to prevent fraud, or to protect legal rights.
        </p>
        <p>
          <strong>Business Transfers</strong> — if Salebiz undergoes a business
          sale, merger, restructure, or asset transfer, personal information may
          be transferred to the acquiring entity.
        </p>
      </>
    ),
  },
  {
    id: "gmail-integration",
    number: "07",
    title: "Gmail Integration (Connected Inbox)",
    content: (
      <>
        <p>
          Salebiz offers an optional &ldquo;Connected Inbox&rdquo; feature that
          allows brokers to authorise Salebiz to send emails on their behalf
          through their Gmail account, using the OAuth scope{" "}
          <code>https://www.googleapis.com/auth/gmail.send</code>. Salebiz does
          not request or use any other Gmail permission, and we do not read,
          modify, or delete the user&apos;s emails. We only call Gmail&apos;s
          send endpoint to deliver emails composed by the broker inside Salebiz.
          We retain the resulting Gmail Message ID and Thread ID for the
          broker&apos;s CRM activity log; we do not retain inbox content or
          message bodies. OAuth refresh tokens are encrypted at rest with
          AES-256-GCM and are never exposed to any client. Users can revoke this
          access at any time from within Salebiz (Dashboard → Workspace →
          Profile → Disconnect Gmail) or at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="break-all"
          >
            https://myaccount.google.com/permissions
          </a>
          .
        </p>
        <p>
          Salebiz&apos;s use and transfer of information received from Google
          APIs to any other app will adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </>
    ),
  },
  {
    id: "security",
    number: "08",
    title: "Storage and security",
    content: (
      <>
        <p>
          Salebiz takes reasonable steps to protect personal information from
          misuse, interference, loss, unauthorised access, modification, or
          disclosure. Security measures include:
        </p>
        <ul>
          <li>Encrypted data storage</li>
          <li>Secure server infrastructure</li>
          <li>Access controls</li>
          <li>Authentication processes</li>
          <li>Monitoring of system activity</li>
        </ul>
        <p>
          Personal information may be stored on secure cloud infrastructure
          located within Australia or internationally. While reasonable
          safeguards are implemented, no data transmission or storage system can
          be guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    number: "09",
    title: "Data retention",
    content: (
      <p>
        Personal information is retained only for as long as necessary to fulfil
        operational, legal, and regulatory requirements. Salebiz may retain
        account records, listing records, messages, NDAs, and payment records
        even after account closure where required by law or legitimate business
        purposes.
      </p>
    ),
  },
  {
    id: "cookies",
    number: "10",
    title: "Cookies and tracking technologies",
    content: (
      <>
        <p>
          Salebiz uses cookies and similar technologies to support Platform
          functionality. Cookies may be used to:
        </p>
        <ul>
          <li>Maintain login sessions</li>
          <li>Enable platform functionality</li>
          <li>Monitor system performance</li>
          <li>Analyse user behaviour</li>
          <li>Improve user experience</li>
        </ul>
        <p>
          Users may adjust browser settings to restrict cookie usage; however,
          certain features of the Platform may not function correctly if cookies
          are disabled.
        </p>
      </>
    ),
  },
  {
    id: "third-party-links",
    number: "11",
    title: "Third-party links",
    content: (
      <p>
        The Platform may contain links to third-party websites or services.
        Salebiz does not control third-party websites and is not responsible for
        their privacy practices or content. Users accessing third-party websites
        do so at their own risk.
      </p>
    ),
  },
  {
    id: "access",
    number: "12",
    title: "Access to personal information",
    content: (
      <p>
        Users may request access to personal information held by Salebiz.
        Requests must be submitted in writing to{" "}
        <a href="mailto:privacy@salebiz.com.au">privacy@salebiz.com.au</a>.
        Salebiz may require verification of identity before releasing
        information.
      </p>
    ),
  },
  {
    id: "correction",
    number: "13",
    title: "Correction of personal information",
    content: (
      <p>
        Users may request correction of inaccurate or incomplete personal
        information. Salebiz will take reasonable steps to update records where
        appropriate.
      </p>
    ),
  },
  {
    id: "overseas",
    number: "14",
    title: "Overseas disclosure",
    content: (
      <p>
        Personal information may be stored or processed outside Australia where
        necessary to operate the Platform. This may include international cloud
        infrastructure and service providers. Where overseas disclosure occurs,
        reasonable steps are taken to ensure personal information is handled
        securely.
      </p>
    ),
  },
  {
    id: "marketing",
    number: "15",
    title: "Marketing communications",
    content: (
      <>
        <p>Salebiz may send communications relating to:</p>
        <ul>
          <li>Platform updates</li>
          <li>System notifications</li>
          <li>Service announcements</li>
        </ul>
        <p>
          Users may opt out of marketing communications where permitted.
          Service-related communications may still be delivered.
        </p>
      </>
    ),
  },
  {
    id: "children",
    number: "16",
    title: "Children's privacy",
    content: (
      <p>
        The Platform is not intended for individuals under the age of 18.
        Salebiz does not knowingly collect personal information from minors.
        Accounts identified as belonging to minors may be removed.
      </p>
    ),
  },
  {
    id: "data-breach",
    number: "17",
    title: "Data breach management",
    content: (
      <>
        <p>If a data breach occurs, Salebiz will take reasonable steps to:</p>
        <ul>
          <li>Investigate the breach</li>
          <li>Contain the breach</li>
          <li>Assess the risk</li>
          <li>Notify affected individuals where required</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
      </>
    ),
  },
  {
    id: "changes",
    number: "18",
    title: "Changes to this privacy policy",
    content: (
      <p>
        Salebiz may update this Privacy Policy from time to time. Updated
        versions become effective once published on the Platform. Continued use
        of the Platform indicates acceptance of the updated policy.
      </p>
    ),
  },
  {
    id: "complaints",
    number: "19",
    title: "Complaints",
    content: (
      <>
        <p>
          If a user believes their privacy rights have been breached, a
          complaint may be submitted to{" "}
          <a href="mailto:privacy@salebiz.com.au">privacy@salebiz.com.au</a>.
          Complaints will be reviewed and addressed in accordance with
          applicable privacy laws.
        </p>
        <p>
          If a complaint is not resolved, it may be referred to the Office of
          the Australian Information Commissioner (OAIC) at{" "}
          <a
            href="https://www.oaic.gov.au"
            target="_blank"
            rel="noreferrer"
          >
            oaic.gov.au
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "contact",
    number: "20",
    title: "Contact details",
    content: (
      <>
        <p>Privacy enquiries:</p>
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
            <a href="mailto:privacy@salebiz.com.au">privacy@salebiz.com.au</a>
          </li>
        </ul>
      </>
    ),
  },
];

export default async function PrivacyPolicyPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background" id="top">
      <PublicHeader session={session} variant="compact" />
      <LegalDocument
        title="Privacy Policy"
        subtitle="How Salebiz collects, uses, stores, and protects your personal information. Written in plain English and aligned with the Australian Privacy Principles."
        lastUpdated={LAST_UPDATED}
        effectiveDate={EFFECTIVE_DATE}
        intro={
          <p>
            This Privacy Policy explains how{" "}
            <strong>THE COMPANY MARKETING PTY LTD</strong> (&ldquo;Salebiz&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects,
            uses, stores, and protects personal information through the Salebiz
            platform (&ldquo;Platform&rdquo;). It applies to all users of{" "}
            <a href="https://www.salebiz.com.au">salebiz.com.au</a>, including
            brokers, buyers, and visitors.
          </p>
        }
        sections={sections}
        related={{ href: "/terms", label: "Terms & Conditions" }}
        contactEmail="privacy@salebiz.com.au"
      />
    </div>
  );
}
