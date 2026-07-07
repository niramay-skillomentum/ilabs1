"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserId, hasSession } from "../../lib/auth";
import toast from "react-hot-toast";
import { DeskSelectionPage } from "./components/DeskSelectionPage";

function DashboardComponent() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = loadUserId();

    if (!uid || !hasSession()) {
      toast.error("Session expired. Login again.");
      router.push("/");
    } else {
      setUserId(uid);
    }
  }, [router]);

  if (!userId) return null; // Avoid flicker before redirect

  return <DeskSelectionPage />;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardComponent />
    </Suspense>
  );
}
