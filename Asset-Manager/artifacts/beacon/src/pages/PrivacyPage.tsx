import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import lighthouseLogo from "@assets/Minimalist_lighthouse_logo_design_1775623783267.png";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      <nav className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-[0_10px_22px_rgba(14,33,24,0.08)] ring-1 ring-[#dce7df]">
            <img src={lighthouseLogo} alt="Beacon" className="h-7 w-7 object-contain shrink-0" />
          </div>
          <span className="font-bold text-[#214636]">Beacon</span>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-gray">
        <h1 className="text-3xl font-bold text-[#214636] mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: January 2026</p>

        <h2>1. Information We Collect</h2>
        <p>Beacon collects information necessary to provide nonprofit management services, including resident case data, donor information, and staff account details. All data is handled with the highest confidentiality standards appropriate for sensitive populations.</p>

        <h2>2. How We Use Information</h2>
        <p>Information is used solely to support safehouse operations, case management, donor stewardship, and program reporting. Data is never sold or shared with third parties without explicit consent.</p>

        <h2>3. Data Security</h2>
        <p>Beacon implements enterprise-grade security including encrypted connections (HSTS), Content Security Policy headers, role-based access control, rate limiting, and comprehensive audit logging. All access is authenticated and logged.</p>

        <h2>4. Cookies</h2>
        <p>Beacon uses minimal cookies for session management (<code>beacon_session</code>), theme preference (<code>beacon_theme</code>), and consent tracking (<code>beacon_consent</code>). These cookies do not track users across sites.</p>

        <h2>5. Resident Data Protection</h2>
        <p>Resident information is stored with the highest level of protection. Identifiable information is accessible only to authorized staff. Resident codes (not names) are used in reports to protect identities.</p>

        <h2>6. Donor Privacy</h2>
        <p>Donor information is used only for gift processing, stewardship communications, and internal analytics to improve fundraising. Anonymous donations are supported.</p>

        <h2>7. Data Retention</h2>
        <p>Case data is retained according to Philippine data protection laws and social welfare regulations. Donors may request their information be deleted at any time.</p>

        <h2>8. Your Rights</h2>
        <p>Under applicable data protection laws, you have the right to access, correct, or delete your personal information. Contact your organization's administrator or data protection officer to exercise these rights.</p>

        <h2>9. Contact</h2>
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
