// File: src/pages/index.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the student dashboard or login page
    router.push("/student/exam/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
      <p className="text-lg font-semibold">Redirecting...</p>
    </div>
  );
}