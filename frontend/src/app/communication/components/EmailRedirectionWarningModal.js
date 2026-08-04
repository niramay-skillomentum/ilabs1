"use client";

import React from "react";

export default function EmailRedirectionWarningModal({
  open,
  onClose,
  title = "Email Redirection Warning",
  message,
  expectedEmail,
  submittedEmail
}) {
  if (!open) return null;

  return (
    <>
      <div 
        className="modal-overlay" 
        style={{ zIndex: 10000, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)" }}
        onClick={onClose} 
      />
      <div 
        className="modal-box" 
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001,
          width: "520px",
          maxWidth: "92vw",
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.3), 0 0 0 2px #dc2626",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-inter, system-ui, sans-serif)"
        }}
      >
        {/* High-Severity Red Header */}
        <div style={{
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          color: "#ffffff"
        }}>
          <span style={{ fontSize: "32px", lineHeight: 1 }}>🚫</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", letterSpacing: "-0.01em" }}>
              {title}
            </h3>
            <span style={{ fontSize: "12px", color: "#fca5a5", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Strict Security & Routing Enforced
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: "24px", color: "#334155", fontSize: "14px", lineHeight: "1.6" }}>
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "16px",
            color: "#991b1b",
            fontWeight: "500",
            marginBottom: "20px",
            whiteSpace: "pre-line"
          }}>
            {message || "Recipient email validation failed.\n\nThe selected recipient does not match the configured operations mailbox for this trade or workstation. Sending emails to an incorrect destination may result in operational failures, data leakage, or settlement delays. Please verify the recipient before proceeding."}
          </div>

          {(submittedEmail || expectedEmail) && (
            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
              fontSize: "13px"
            }}>
              {submittedEmail && (
                <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: "500" }}>Attempted Destination:</span>
                  <code style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                    {submittedEmail}
                  </code>
                </div>
              )}
              {expectedEmail && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: "500" }}>Registered Mailbox:</span>
                  <code style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                    {expectedEmail}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zero Override Footer */}
        <div style={{
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px"
        }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", marginRight: "auto" }}>
            🔒 Override is disabled by security rules.
          </span>
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#0f172a"}
            onMouseOut={(e) => e.currentTarget.style.background = "#1e293b"}
          >
            Acknowledge & Correct
          </button>
        </div>
      </div>
    </>
  );
}
