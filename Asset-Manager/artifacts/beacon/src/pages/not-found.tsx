import { Link } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f9f9f8] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 bg-[#0e2118] rounded-2xl flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-[#2a9d72]" />
      </div>
      <h1 className="text-4xl font-bold text-[#0e2118] mb-2">404</h1>
      <p className="text-lg text-gray-500 mb-1">Page not found</p>
      <p className="text-sm text-gray-400 mb-8 max-w-sm">
        The page you're looking for doesn't exist or you don't have permission to access it.
      </p>
      <Link href="/">
        <Button className="bg-[#0e2118] hover:bg-[#1a3a28] text-white">
          Return to Home
        </Button>
      </Link>
      <p className="mt-6 text-xs text-gray-300">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
      </p>
    </div>
  );
}
