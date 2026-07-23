import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function SendSSIModal({
  isOpen, setIsOpen, currentTrade, userId, desk, channel, sendReply, isSendingReply
}) {
  const [ssiData, setSsiData] = useState({
    beneficiaryName: "",
    beneficiaryBank: "",
    beneficiaryBIC: "",
    accountNumber: "",
    currency: "",
    settlementMethod: "SWIFT",
    correspondentBank: "",
    intermediaryBank: "",
    paymentReference: ""
  });

  useEffect(() => {
    if (isOpen && currentTrade) {
      setSsiData({
        beneficiaryName: "",
        beneficiaryBank: "",
        beneficiaryBIC: "",
        accountNumber: "",
        currency: currentTrade.currency || "",
        settlementMethod: "SWIFT",
        correspondentBank: "",
        intermediaryBank: "",
        paymentReference: currentTrade.tradeRef || ""
      });
    }
  }, [isOpen, currentTrade]);

  if (!isOpen || !currentTrade) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSsiData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!ssiData.beneficiaryName || !ssiData.beneficiaryBIC || !ssiData.accountNumber) {
      return toast.error("Please fill in mandatory fields (Name, BIC, Account)");
    }
    
    // Format the email body with the structured block
    const emailBody = `Dear Counterparty,\n\nPlease find our updated settlement instructions below:\n\n[PROVIDED_SSI_START]\nBeneficiary Name: ${ssiData.beneficiaryName}\nBeneficiary Bank: ${ssiData.beneficiaryBank}\nBeneficiary BIC: ${ssiData.beneficiaryBIC}\nAccount Number: ${ssiData.accountNumber}\nCurrency: ${ssiData.currency}\nSettlement Method: ${ssiData.settlementMethod}\nCorrespondent Bank: ${ssiData.correspondentBank}\nIntermediary Bank: ${ssiData.intermediaryBank}\nPayment Reference: ${ssiData.paymentReference}\n[PROVIDED_SSI_END]\n\nPlease let us know if you require any further information.\n\nBest regards,\nSettlement Operations`;

    sendReply(emailBody);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Send Settlement Instructions</h3>
          <button className="btn-close-tab" onClick={() => setIsOpen(false)}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <p style={{ marginTop: 0, marginBottom: '20px', fontSize: '13px', color: '#605e5c' }}>
            Provide the correct settlement instructions. These details will be sent to the counterparty for verification.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Beneficiary Name *</label>
              <input type="text" name="beneficiaryName" value={ssiData.beneficiaryName} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Beneficiary Bank</label>
              <input type="text" name="beneficiaryBank" value={ssiData.beneficiaryBank} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Beneficiary BIC *</label>
              <input type="text" name="beneficiaryBIC" value={ssiData.beneficiaryBIC} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Account Number *</label>
              <input type="text" name="accountNumber" value={ssiData.accountNumber} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Currency</label>
              <input type="text" name="currency" value={ssiData.currency} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Settlement Method</label>
              <input type="text" name="settlementMethod" value={ssiData.settlementMethod} readOnly style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px', background: '#f3f2f1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Correspondent Bank</label>
              <input type="text" name="correspondentBank" value={ssiData.correspondentBank} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Intermediary Bank</label>
              <input type="text" name="intermediaryBank" value={ssiData.intermediaryBank} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Payment Reference</label>
              <input type="text" name="paymentReference" value={ssiData.paymentReference} onChange={handleChange} style={{ width: '100%', padding: '6px', border: '1px solid #c8c8c8', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn-action" onClick={() => setIsOpen(false)}>Cancel</button>
          <button className="btn-action primary" disabled={isSendingReply} onClick={handleSubmit}>
            {isSendingReply ? "Sending..." : "Send Instructions"}
          </button>
        </div>
      </div>
    </div>
  );
}
