import React, { useEffect, useState } from "react";
import api from "../services/api";

const documentLabels = {
  business_registration: "Business Registration",
  authorized_representative_id: "Authorized Representative ID",
  bank_proof: "Bank Account Proof",
  hotel_license: "Hotel / Operating License",
  tax_document: "Tax Document",
  signed_agreement: "Signed Partnership Agreement",
  other: "Other Supporting Document",
};

const statusSteps = [
  "application_submitted", "under_review", "additional_information_required", "conditionally_approved",
  "agreement_pending", "agreement_sent", "signed_agreement_submitted", "agreement_under_review", "active",
];

export default function PartnershipCompliance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("business_registration");
  const [file, setFile] = useState(null);

  const load = async () => {
    try { setLoading(true); const res = await api.get("/partnership/my"); setData(res.data); }
    catch (error) { setMessage(error.response?.data?.message || "Unable to load partnership status."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submitDocument = async (event) => {
    event.preventDefault();
    if (!file) return setMessage("Select a document first.");
    try {
      setUploading(true); setMessage("");
      const body = new FormData(); body.append("document", file); body.append("documentType", documentType);
      await api.post("/partnership/documents", body, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null); setMessage("Document submitted for review."); await load();
    } catch (error) { setMessage(error.response?.data?.message || "Document upload failed."); }
    finally { setUploading(false); }
  };

  const downloadDocument = async (doc) => {
    try {
      const response = await api.get(`/partnership/documents/${doc._id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = doc.originalName || "document"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(error.response?.data?.message || "Document download failed."); }
  };

  if (loading) return <main className="min-h-screen pt-24 px-margin-mobile md:px-margin-desktop"><div className="card-ambient p-8 animate-pulse">Loading partnership...</div></main>;
  const hotel = data?.hotel;
  if (!hotel) return <main className="min-h-screen pt-24 px-margin-mobile md:px-margin-desktop"><div className="card-ambient p-8">{message || "Hotel application not found."}</div></main>;
  const currentIndex = Math.max(0, statusSteps.indexOf(hotel.partnershipStatus));

  return (
    <main className="df-partnership-page min-h-screen bg-surface-cream pt-24 pb-28 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6"><span className="badge-gold">Hotel Partnership</span><h1 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">Partnership & Compliance</h1><p className="text-on-surface-variant">{hotel.hotelName} · {hotel.application?.applicationNumber || "Application"}</p></div>
        {message && <div className="mb-4 rounded-xl border border-border-subtle bg-white p-4">{message}</div>}
        <section className="card-ambient p-5 md:p-6 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-label-sm uppercase tracking-wider text-on-surface-variant">Current status</p><h2 className="font-headline-md text-text-deep-green capitalize">{String(hotel.partnershipStatus || "application_submitted").replaceAll("_", " ")}</h2></div><span className="status-pill bg-secondary-container text-text-deep-green">{hotel.portalAccess ? "Portal enabled" : "Activation pending"}</span></div>
          <div className="df-partnership-progress mt-5">{statusSteps.map((step, index) => <div key={step} className={index <= currentIndex ? "is-done" : ""}><span>{index + 1}</span><small>{step.replaceAll("_", " ")}</small></div>)}</div>
          {hotel.compliance?.partnerMessage && <div className="mt-5 rounded-xl bg-surface-container-low p-4"><strong>Message from DineFor</strong><p className="mt-1 text-on-surface-variant">{hotel.compliance.partnerMessage}</p></div>}
        </section>

        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-5">
          <section className="card-ambient p-5 md:p-6"><h2 className="font-headline-md text-text-deep-green">Compliance documents</h2><p className="text-on-surface-variant mt-1">Private documents are available only to your hotel and authorized DineFor administrators.</p><div className="mt-5 space-y-3">{(data.documents || []).map((doc) => <div key={doc._id} className="df-document-row"><div><strong>{documentLabels[doc.documentType] || doc.documentType}</strong><small>{doc.originalName}</small></div><div><span className={`status-pill ${doc.status === "verified" ? "bg-success/10 text-success" : doc.status === "rejected" ? "bg-error/10 text-error" : "bg-surface-container-low"}`}>{doc.status.replaceAll("_", " ")}</span><button type="button" className="text-secondary hover:underline" onClick={() => downloadDocument(doc)}>Download</button></div>{doc.reviewNote && <p>{doc.reviewNote}</p>}</div>)}{!data.documents?.length && <p className="text-on-surface-variant py-6">No compliance documents submitted yet.</p>}</div></section>
          <section className="card-ambient p-5 md:p-6"><h2 className="font-headline-md text-text-deep-green">Submit document</h2><form className="mt-5 space-y-4" onSubmit={submitDocument}><label className="block"><span className="font-label-sm">Document type</span><select className="form-select w-full mt-1" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>{Object.entries(documentLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block"><span className="font-label-sm">PDF or image · maximum 12 MB</span><input className="form-input w-full mt-1" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button className="btn-primary w-full" disabled={uploading}>{uploading ? "Uploading..." : "Submit securely"}</button></form><div className="mt-6 pt-5 border-t border-border-subtle"><h3 className="font-label-md text-text-deep-green">Agreement</h3><p className="text-on-surface-variant mt-2">Agreement generation and signed-agreement verification are enabled in the next agreement-engine stage. Uploading a file never activates a hotel automatically.</p></div></section>
        </div>
      </div>
    </main>
  );
}
