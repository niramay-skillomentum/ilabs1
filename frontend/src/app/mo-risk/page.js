"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";

function MoRiskComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(null);
  const [desk, setDesk] = useState("Risk");
  const [allTrades, setAllTrades] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrade, setSelectedTrade] = useState(null);

  const getToken = () => sessionStorage.getItem("auth_token") || Cookies.get("auth_token");

  useEffect(() => {
    let uid = searchParams.get("userId");
    let dsk = searchParams.get("desk");

    if (!getToken()) {
      alert("Session expired. Login again.");
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
          setDesk(data.desk || "Risk");
        }
      })
      .catch(err => console.error(err));
    } else {
      setUserId(uid);
      setDesk(dsk || "Risk");
    }

    // Load trades
    fetch("/api/trade/all", {
      headers: { "Authorization": "Bearer " + getToken() }
    })
      .then(res => res.json())
      .then(data => {
        setAllTrades(data.trades || []);
      });
  }, [searchParams]);

  const filteredTrades = allTrades.filter(t => {
    if (!searchQuery) return true;
    const val = searchQuery.toLowerCase();
    return (t.tradeRef || "").toLowerCase().includes(val) ||
           (t.currency || "").toLowerCase().includes(val) ||
           String(t.amount || "").includes(val);
  });

  if (!userId) return null;

  return (
    <div style={{ margin:0, fontFamily:"Segoe UI, Arial", background:"#f5f7fa", height:"100vh", display:"flex", flexDirection:"column" }}>
      {/* TOP BAR */}
      <div style={{ height:"48px", background:"#0B1F3A", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", fontSize:"14px", flexShrink:0 }}>
        <div style={{ fontWeight:600 }}>MO Risk Management System</div>
        <div>{desk} Desk | Welcome, {userId}</div>
      </div>

      {/* MAIN */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* LEFT */}
        <div style={{ width:"40%", borderRight:"1px solid #ddd", background:"white", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"10px", borderBottom:"1px solid #eee" }}>
            <input 
              placeholder="Search trades..."
              style={{ width:"100%", padding:"8px", border:"1px solid #ddd", borderRadius:"4px" }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ flex:1, overflowY:"auto" }}>
            {filteredTrades.map(trade => (
              <div 
                key={trade.tradeRef}
                style={{ padding:"12px", borderBottom:"1px solid #eee", cursor:"pointer", background: selectedTrade?.tradeRef === trade.tradeRef ? "#f0f8ff" : "white" }}
                onClick={() => setSelectedTrade(trade)}
              >
                <div style={{ fontWeight:600 }}>Termsheet - {trade.counterparty || "Unknown"}</div>
                <div style={{ fontSize:"12px", color:"#555" }}>{trade.tradeRef}</div>
                <div style={{ fontSize:"12px", color:"#777" }}>{trade.currency} {Number(trade.amount).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ width:"60%", padding:"16px", display:"flex", flexDirection:"column" }}>
          <div style={{ background:"white", border:"1px solid #ddd", padding:"16px", flex:1, overflowY:"auto" }}>
            {!selectedTrade ? (
              <div style={{ color:"#777", textAlign:"center", marginTop:"40px" }}>Select a document to view</div>
            ) : (
              <TermsheetViewer trade={selectedTrade} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsheetViewer({ trade }) {
  const moTruth = trade.truths?.mo || trade.truth;
  const refAmount = (moTruth && moTruth.amount !== undefined) ? moTruth.amount : trade.amount;
  const refValueDate = (moTruth && moTruth.valueDate) ? moTruth.valueDate : trade.valueDate;
  const refCurrency = (moTruth && moTruth.currency) ? moTruth.currency : trade.currency;
  const refCounterparty = (moTruth && moTruth.counterparty) ? moTruth.counterparty : trade.counterparty;

  const tradeDateFormatted = trade.tradeDate ? new Date(trade.tradeDate).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}) : "";
  const valueDateFormatted = refValueDate ? new Date(refValueDate).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}) : "";

  return (
    <>
      <h3>Termsheet (FO Reference)</h3>
      <hr />
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"14px", border:"1px solid #ddd" }}>
        <tbody>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold", width:"30%" }}>Trade Ref:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.tradeRef || ""}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Status:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.currentStatus || ""}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Next Desk:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.nextDesk || ""}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Age:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.age || 0}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Trade Date:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{tradeDateFormatted}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Value Date:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{valueDateFormatted}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Counterparty:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{refCounterparty || "N/A"}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Entity:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.entity || ""}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>FO Region:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.foRegion || ""}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Product:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.product || ""}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Trade Type:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.tradeType || ""}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Settlement Type:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.settlementType || ""}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Direction:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{trade.direction || ""}</td></tr>
          <tr style={{ background:"#f9f9f9" }}><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Currency:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{refCurrency || ""}</td></tr>
          <tr><td style={{ padding:"6px", border:"1px solid #ddd", fontWeight:"bold" }}>Amount:</td><td style={{ padding:"6px", border:"1px solid #ddd" }}>{Number(refAmount).toLocaleString()}</td></tr>
        </tbody>
      </table>
    </>
  );
}

export default function MoRiskPage() {
  return (
    <Suspense fallback={<div style={{padding:"20px",fontFamily:"Arial"}}>Loading...</div>}>
      <MoRiskComponent />
    </Suspense>
  );
}
