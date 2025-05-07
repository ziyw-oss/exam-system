// File: app/page.tsx
'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/exam/dashboard");
  }, [router]);

  return <p className="text-center mt-10 text-gray-600">Redirecting to dashboard...</p>;
}