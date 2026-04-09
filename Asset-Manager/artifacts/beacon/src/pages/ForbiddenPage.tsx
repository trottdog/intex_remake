import { Link } from "wouter";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-6">
        <ShieldX className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-4xl font-bold text-[#0e2118] mb-2">403</h1>
      <p className="text-lg text-gray-500 mb-1">Access Denied</p>
      <p className="text-sm text-gray-400 mb-8 max-w-sm">
        You do not have permission to access this resource. If you believe this is an error, contact your administrator.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline">Return to Home</Button>
        </Link>
        <Link href="/login">
          <Button className="bg-[#0e2118] hover:bg-[#1a3a28] text-white">Sign In</Button>
        </Link>
      </div>
      <footer className="absolute bottom-0 left-0 right-0 py-4 text-center text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
        <span className="mx-2">&middot;</span>
        <span>&copy; {new Date().getFullYear()} Beacon</span>
      </footer>
    </div>
  );
}
