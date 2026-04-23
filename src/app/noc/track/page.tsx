"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToTrack() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/track");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
