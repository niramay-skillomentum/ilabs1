"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadUserId, loadFullName, getToken } from "../../lib/auth";
import toast from "react-hot-toast";

function SsiDatabaseComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState("Settlement");
  const [alertCode, setAlertCode] = useState("");
  const [acronymCode, setAcronymCode] = useState("");
  const [ssiResult, setSsiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let uid = loadUserId();
    let fullName = loadFullName();
    let dsk = searchParams.get("desk");

    if (!getToken()) {
      toast.error("Session expired. Login again.");
      router.push("/");
      return;
    }

    if (!uid) {
      fetch("/api/session/info", {
        headers: { "Authorization": "Bearer " + getToken() }
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          setUserId(data.fullName || data.userId);
          setDesk(data.desk || "Settlement");
        }
      })
      .catch(err => console.error(err));
    } else {
      setUserId(fullName || uid);
      setDesk(dsk || "Settlement");
    }
  }, [searchParams]);

  const handleSearch = () => {
    if (!alertCode.trim() || !acronymCode.trim()) {
      return toast.error("Both Alert Code and Acronym Code are required");
    }
    setIsLoading(true);
    setHasSearched(true);
    setSsiResult(null);

    fetch(`/api/ssi/search-codes?alertCode=${encodeURIComponent(alertCode.trim())}&acronymCode=${encodeURIComponent(acronymCode.trim())}`, {
      headers: { "Authorization": "Bearer " + getToken() }
    })
      .then(res => res.json())
      .then(data => {
        setIsLoading(false);
        if (data.success) {
          setSsiResult(data.ssi);
        } else {
          toast.error(data.error || "SSI not found");
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.error("Failed to search SSI:", err);
        toast.error("Error searching SSI Database");
      });
  };

  if (!userId) return null;

  return (
    <div style={{ margin:0, fontFamily:"Segoe UI, Arial", background:"#f5f7fa", color:"#333", height:"100vh", display:"flex", flexDirection:"column" }}>
      {/* TOP BAR */}
      <div style={{ height:"48px", background:"#0B1F3A", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", fontSize:"14px", flexShrink:0 }}>
        <div style={{ fontWeight:600 }}>Global SSI Database (Static Data)</div>
        <div>{desk} Desk | Welcome, {userId}</div>
      </div>

      {/* MAIN */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* LEFT */}
        <div style={{ width:"35%", borderRight:"1px solid #ddd", background:"white", display:"flex", flexDirection:"column", padding:"20px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>Search Instructions</h3>
          <p style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
            Enter the <strong>Alert Code</strong> (6-character alphanumeric) and <strong>Acronym Code</strong> (6-digit numeric) provided by the counterparty to retrieve standard settlement instructions.
          </p>
          
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444", display: "block", marginBottom: "4px" }}>Alert Code</label>
            <input 
              placeholder="e.g., A1B2C3"
              style={{ width: "100%", boxSizing: "border-box", padding:"10px", border:"1px solid #ddd", borderRadius:"4px", color:"#333", backgroundColor:"#fff", fontFamily: "monospace", fontSize: "15px", letterSpacing: "2px" }}
              value={alertCode}
              onChange={e => setAlertCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              maxLength={6}
            />
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444", display: "block", marginBottom: "4px" }}>Acronym Code</label>
            <input 
              placeholder="e.g., 100245"
              style={{ width: "100%", boxSizing: "border-box", padding:"10px", border:"1px solid #ddd", borderRadius:"4px", color:"#333", backgroundColor:"#fff", fontFamily: "monospace", fontSize: "15px", letterSpacing: "2px" }}
              value={acronymCode}
              onChange={e => setAcronymCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              maxLength={6}
            />
          </div>
          
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            style={{ padding: "12px 16px", background: "#0B1F3A", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", width: "100%" }}
          >
            {isLoading ? "Searching..." : "Search SSI Database"}
          </button>

          <div style={{ flex:1, overflowY:"auto", marginTop: "20px" }}>
            {isLoading && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#555" }}>
                <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Searching Database...</div>
                <div style={{ margin: "20px auto", width: "30px", height: "30px", border: "3px solid #f3f3f3", borderTop: "3px solid #0B1F3A", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            
            {!isLoading && hasSearched && !ssiResult && (
              <div style={{ padding: "20px", textAlign: "center", color: "#d9534f", background: "#fdf2f2", border: "1px solid #d9534f", borderRadius: "4px" }}>
                <strong>No SSI found</strong> matching the provided codes. Please verify the Alert Code and Acronym Code from the counterparty.
              </div>
            )}

            {!isLoading && ssiResult && (
              <div style={{ padding: "16px", background: "#dff0d8", border: "1px solid #3c763d", color: "#3c763d", borderRadius: "4px" }}>
                <strong>Success:</strong> SSI profile retrieved.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ width:"65%", padding:"24px", display:"flex", flexDirection:"column", background: "#eceff1" }}>
          <div style={{ background:"white", border:"1px solid #ddd", padding:"24px", flex:1, overflowY:"auto", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            {!ssiResult ? (
              <div style={{ color:"#777", textAlign:"center", marginTop:"100px", fontSize: "16px" }}>
                Enter both codes on the left to view instruction details.
              </div>
            ) : (
              <SsiViewer ssi={ssiResult} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SsiViewer({ ssi }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "2px solid #0B1F3A", paddingBottom: "12px" }}>
        <h2 style={{ margin: 0, color: "#0B1F3A" }}>Standard Settlement Instruction (SSI)</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ background: "#0B1F3A", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "bold" }}>
            Alert: {ssi.alertCode}
          </div>
          <div style={{ background: "#1E3A5F", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "bold" }}>
            Acronym: {ssi.acronymCode}
          </div>
        </div>
      </div>
      
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"15px", border:"1px solid #ddd", marginTop: "20px" }}>
        <tbody>
          <tr style={{ background:"#f9f9f9" }}>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", width:"30%", color: "#444" }}>Beneficiary Name:</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px" }}>{ssi.beneficiaryName}</td>
          </tr>
          <tr>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", color: "#444" }}>Beneficiary Bank:</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px" }}>{ssi.beneficiaryBank}</td>
          </tr>
          <tr style={{ background:"#f9f9f9" }}>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", color: "#444" }}>Beneficiary BIC (SWIFT):</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px", letterSpacing: "1px" }}>{ssi.beneficiaryBIC}</td>
          </tr>
          <tr>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", color: "#444" }}>Account Number:</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px", letterSpacing: "1px" }}>{ssi.accountNumber}</td>
          </tr>
          <tr style={{ background:"#f9f9f9" }}>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", color: "#444" }}>Account Type:</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px" }}>{ssi.accountType}</td>
          </tr>
          <tr>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", color: "#444" }}>Settlement Method:</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px" }}>{ssi.settlementMethod}</td>
          </tr>
          <tr style={{ background:"#f9f9f9" }}>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontWeight:"bold", color: "#444" }}>Correspondent Bank:</td>
            <td style={{ padding:"12px", border:"1px solid #ddd", fontFamily: "monospace", fontSize: "16px" }}>{ssi.correspondentBank}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "30px", padding: "16px", background: "#f8f9fa", borderLeft: "4px solid #17a2b8", fontSize: "13px", color: "#666" }}>
        <strong>Note:</strong> These instructions are legally binding standard standing instructions. Ensure that your system bookings perfectly match these fields (case-sensitive where applicable) before approving settlement.
      </div>
    </>
  );
}

export default function SsiDatabasePage() {
  return (
    <Suspense fallback={<div style={{padding:"20px",fontFamily:"Arial"}}>Loading...</div>}>
      <SsiDatabaseComponent />
    </Suspense>
  );
}
