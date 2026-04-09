import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      <nav className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#214636] rounded flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#2a9d72]" />
          </div>
          <span className="font-bold text-[#214636]">Beacon</span>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-gray">
        <h1 className="text-3xl font-bold text-[#214636] mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: April 9, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>Beacon collects information necessary to operate nonprofit services, including resident case data, donor information, staff account details, and system audit records. We only request data needed to provide the platform and protect sensitive populations.</p>

        <h2>2. How We Use Information</h2>
        <p>We use information to support safehouse operations, case management, donor stewardship, program reporting, access control, and platform security. We do not sell personal data.</p>

        <h2>3. Data Security</h2>
        <p>Beacon is designed to use encrypted connections, role-based access controls, security headers, and audit logging to protect sensitive records. Access to protected areas requires authentication and is limited by account role.</p>

        <h2>4. Cookies</h2>
        <p>Beacon uses a small set of first-party preference cookies only. These currently include <code>beacon_theme</code> for display preference, <code>beacon_consent</code> for your privacy choice, and <code>sidebar_state</code> for dashboard layout preference. These cookies are limited to Beacon and are not used for cross-site tracking.</p>
        <p>Beacon authentication does not depend on cookies. Login uses a bearer token held in application memory rather than a persistent browser cookie.</p>

        <h2>5. Essential vs Optional Consent</h2>
        <p>The consent banner lets you choose between essential preferences only and optional analytics or personalization. Essential preferences keep the application usable and remember interface choices. Optional consent is only used for non-essential features when those features are enabled.</p>

        <h2>6. Resident Data Protection</h2>
        <p>Resident information is stored with the highest level of protection. Identifiable information is accessible only to authorized staff. Resident codes (not names) are used in reports to protect identities.</p>

        <h2>7. Donor Privacy</h2>
        <p>Donor information is used for gift processing, stewardship communications, tax documentation, and internal fundraising analysis. Anonymous donations are supported where operationally feasible.</p>

        <h2>8. Data Retention</h2>
        <p>Case data is retained according to Philippine data protection laws and social welfare regulations. Donors may request their information be deleted at any time.</p>

        <h2>9. Your Rights</h2>
        <p>Under applicable data protection laws, you have the right to access, correct, or delete your personal information. Contact your organization's administrator or data protection officer to exercise these rights.</p>

        <h2>10. Contact</h2>
        <p>For privacy-related inquiries, contact your organization's designated data protection officer or system administrator.</p>
      </div>
      <footer className="border-t border-gray-100 py-6 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} Beacon Nonprofit Platform. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
