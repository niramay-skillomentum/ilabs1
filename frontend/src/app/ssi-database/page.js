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
            Enter the <strong>Alert Code</strong> and <strong>Acronym Code</strong> provided by the counterparty to retrieve standard settlement instructions.
          </p>
          
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#444", display: "block", marginBottom: "4px" }}>Alert Code</label>
            <input 
              placeholder="e.g., 100"
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
              placeholder="e.g., AI37"
              style={{ width: "100%", boxSizing: "border-box", padding:"10px", border:"1px solid #ddd", borderRadius:"4px", color:"#333", backgroundColor:"#fff", fontFamily: "monospace", fontSize: "15px", letterSpacing: "2px" }}
              value={acronymCode}
              onChange={e => setAcronymCode(e.target.value.toUpperCase())}
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
  const isCorrespondent = !!(ssi.intermediaryBank || ssi.intermediaryBIC || ssi.intermediaryAccount);
  const settlType = isCorrespondent ? "CORRESPONDENT" : "DIRECT";
  const LINE = "═".repeat(62);
  const DASH = "─".repeat(62);

  return (
    <>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0", padding: "14px 20px", borderRadius: "8px 8px 0 0", background: isCorrespondent ? "#1E3A5F" : "#0B1F3A", color: "white" }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>Standard Settlement Instruction ({settlType})</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {ssi.alertCode && (
            <div style={{ background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
              Alert: {ssi.alertCode}
            </div>
          )}
          {ssi.alertAcronym && (
            <div style={{ background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
              Acronym: {ssi.alertAcronym}
            </div>
          )}
          <span style={{ background: isCorrespondent ? "#f59e0b" : "#22c55e", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>
            {settlType}
          </span>
        </div>
      </div>

      {/* SSI Content - monospace formatted */}
      <div style={{ fontFamily: "'Consolas', 'Courier New', monospace", fontSize: "13px", backgroundColor: "#fdfdfd", padding: "20px 24px", border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 8px 8px", color: "#1e293b", lineHeight: "1.8" }}>
        {/* Header */}
        <div style={{ color: "#64748b", fontSize: "12px", letterSpacing: "1px" }}>{LINE}</div>
        <div style={{ fontWeight: "bold", fontSize: "14px", padding: "4px 0", background: "#f1f5f9", textAlign: "center" }}>
          STANDARD SETTLEMENT INSTRUCTION ({settlType} SETTLEMENT)
        </div>
        <div style={{ color: "#64748b", fontSize: "12px", letterSpacing: "1px" }}>{LINE}</div>

        {/* Currency & Asset Class */}
        <div style={{ padding: "10px 0" }}>
          {ssi.ssiId && (
            <div style={{ marginBottom: "6px" }}><strong style={{ display: "inline-block", width: "200px", color: "#0f766e" }}>SSI ID:</strong> <span style={{ color: "#0f766e", fontWeight: "bold", fontSize: "14px" }}>{ssi.ssiId}</span></div>
          )}
          <div><strong style={{ display: "inline-block", width: "200px" }}>Currency:</strong> {ssi.currency}</div>
          <div><strong style={{ display: "inline-block", width: "200px" }}>Asset Class:</strong> FX / Cash</div>
          <div><strong style={{ display: "inline-block", width: "200px" }}>Settlement Method:</strong> {ssi.settlementMethod || "SWIFT"}</div>
          {ssi.counterpartyName && (
            <div><strong style={{ display: "inline-block", width: "200px" }}>Counterparty:</strong> {ssi.counterpartyName}</div>
          )}
        </div>
        <div style={{ color: "#cbd5e1", letterSpacing: "1px" }}>{DASH}</div>

        {/* Agent Bank Section (Correspondent only) */}
        {isCorrespondent && (
          <>
            <div style={{ padding: "10px 0" }}>
              <div style={{ color: "#1E3A5F", fontWeight: "bold", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "1px" }}>▎ Agent / Intermediary Bank</div>
              <div><strong style={{ display: "inline-block", width: "200px" }}>Agent Bank (Inter):</strong> <span style={{ color: "#0f172a" }}>{ssi.intermediaryBIC || ssi.beneficiaryBIC || ""} ({ssi.intermediaryBank || ssi.correspondentBank || ""})</span></div>
              <div><strong style={{ display: "inline-block", width: "200px" }}>Account at Agent:</strong> <span style={{ color: "#0f172a" }}>{ssi.intermediaryAccount || ""}</span></div>
            </div>
            <div style={{ color: "#cbd5e1", letterSpacing: "1px" }}>{DASH}</div>
          </>
        )}

        {/* Beneficiary Bank Section */}
        <div style={{ padding: "10px 0" }}>
          <div style={{ color: "#1E3A5F", fontWeight: "bold", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "1px" }}>▎ Beneficiary Bank</div>
          <div><strong style={{ display: "inline-block", width: "200px" }}>Beneficiary Bank:</strong> <span style={{ color: "#0f172a" }}>{ssi.beneficiaryBIC || ""} ({ssi.beneficiaryBank || ""})</span></div>
          <div><strong style={{ display: "inline-block", width: "200px" }}>Account Number/IBAN:</strong> <span style={{ color: "#0f172a" }}>{ssi.accountNumber || ""}</span></div>
          <div><strong style={{ display: "inline-block", width: "200px" }}>Beneficiary Name:</strong> <span style={{ color: "#0f172a" }}>{ssi.beneficiaryName || ""}</span></div>
          {ssi.accountType && (
            <div><strong style={{ display: "inline-block", width: "200px" }}>Account Type:</strong> <span style={{ color: "#0f172a" }}>{ssi.accountType}</span></div>
          )}
          {ssi.country && (
            <div><strong style={{ display: "inline-block", width: "200px" }}>Country:</strong> <span style={{ color: "#0f172a" }}>{ssi.country}</span></div>
          )}
        </div>
        <div style={{ color: "#cbd5e1", letterSpacing: "1px" }}>{DASH}</div>

        {/* Notes */}
        <div style={{ padding: "10px 0" }}>
          <div style={{ color: "#1E3A5F", fontWeight: "bold", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "1px" }}>▎ Notes</div>
          <div style={{ color: "#475569" }}>
            {isCorrespondent
              ? `Route via ${ssi.intermediaryBank || ssi.correspondentBank || "Agent Bank"}. ${ssi.intermediaryBank || "Agent"} will credit ${ssi.beneficiaryBank || "Beneficiary Bank"}'s ledger before final credit.`
              : `Direct settlement. Funds credit the beneficiary's account directly at ${ssi.beneficiaryBank || "the beneficiary bank"}.`
            }
          </div>
          {ssi.field72 && (
            <div style={{ marginTop: "4px", color: "#64748b", fontSize: "12px" }}>Field 72: {ssi.field72}</div>
          )}
        </div>
        <div style={{ color: "#64748b", fontSize: "12px", letterSpacing: "1px" }}>{LINE}</div>
      </div>

      <div style={{ marginTop: "20px", padding: "14px 16px", background: "#f8f9fa", borderLeft: "4px solid #17a2b8", fontSize: "13px", color: "#666", borderRadius: "0 4px 4px 0" }}>
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
