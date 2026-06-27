"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserId, hasSession } from "../../lib/auth";
import toast from "react-hot-toast";

function DashboardComponent() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const uid = loadUserId();

    if (!uid || !hasSession()) {
      toast.error("Session expired. Login again.");
      router.push("/");
    } else {
      setUserId(uid);
    }
  }, [router]);

  const goDesk = (desk) => {
    if (userId) {
      router.push(`/workstation?desk=${encodeURIComponent(desk)}`);
    }
  };

  if (!userId) return null; // Avoid flicker before redirect

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        body {
            font-family: 'Inter', sans-serif;
            background: #0b1120;
            color: #f8fafc;
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            margin: 0;
        }
        .container {
            text-align:center;
            background: #0f172a;
            padding: 40px;
            border-radius: 4px;
            border: 1px solid #1e293b;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        h2 {
            margin-top: 0;
            color: #e2e8f0;
            font-weight: 500;
        }
        button {
            padding:12px 24px;
            margin:10px;
            font-size:14px;
            cursor:pointer;
            background: #1e293b;
            color: #e2e8f0;
            border: 1px solid #334155;
            border-radius: 2px;
            font-family: 'Inter', sans-serif;
            transition: background 0.2s;
        }
        button:hover {
            background: #334155;
            border-color: #475569;
        }
      `}} />
      <div className="container">
          <h2>Select Desk</h2>

          <button onClick={() => goDesk('MO')}>MO Desk</button>
          <button onClick={() => goDesk('CONFIRMATION')}>Confirmation Desk</button>
          <button onClick={() => goDesk('SETTLEMENT')}>Settlement Desk</button>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardComponent />
    </Suspense>
  );
}
