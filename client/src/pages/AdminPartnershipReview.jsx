import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const statuses = [
  "under_review",
  "additional_information_required",
  "conditionally_approved",
  "agreement_pending",
  "agreement_sent",
  "agreement_viewed",
  "signed_agreement_submitted",
  "agreement_under_review",
  "active",
  "suspended",
  "rejected",
  "terminated",
  "expired",
];

const humanize = (value) =>
  String(value || "").replaceAll("_", " ");

export default function AdminPartnershipReview() {
  const { hotelId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("under_review");
  const [partnerMessage, setPartnerMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [commissionRate, setCommissionRate] = useState("5");
  const [settlementCycle, setSettlementCycle] = useState("Monthly");
  const [agreementBusy, setAgreementBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/partnership/admin/${hotelId}`);
      setData(res.data);
      setStatus(
        res.data.hotel?.partnershipStatus ||
          (res.data.hotel?.status === "approved"
            ? "active_legacy"
            : "under_review")
      );
      setPartnerMessage(
        res.data.hotel?.compliance?.partnerMessage || ""
      );
      setInternalNote(res.data.hotel?.compliance?.internalNote || "");
      if (res.data.agreement?.terms?.platformCommissionRate != null) {
        setCommissionRate(
          String(res.data.agreement.terms.platformCommissionRate)
        );
      }
      if (res.data.agreement?.terms?.settlementCycle) {
        setSettlementCycle(res.data.agreement.terms.settlementCycle);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load partnership record."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [hotelId]);

  const saveStatus = async () => {
    try {
      await api.patch(`/partnership/admin/${hotelId}/status`, {
        status,
        partnerMessage,
        internalNote,
      });
      setMessage("Partnership status updated.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to update status."
      );
    }
  };

  const reviewDoc = async (id, next) => {
    const note =
      window.prompt(`Review note for ${next}:`, "") ?? "";

    try {
      await api.patch(`/partnership/admin/documents/${id}`, {
        status: next,
        reviewNote: note,
      });
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to review document."
      );
    }
  };

  const downloadDocument = async (doc) => {
    try {
      const response = await api.get(
        `/partnership/documents/${doc._id}/download`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.originalName || "document";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Document download failed."
      );
    }
  };

  const createAgreement = async () => {
    try {
      setAgreementBusy(true);
      setMessage("");
      const response = await api.post(
        `/partnership/admin/${hotelId}/agreement`,
        {
          platformCommissionRate: Number(commissionRate || 5),
          settlementCycle,
          adminNote: internalNote,
        }
      );
      setMessage(
        response.data?.message || "Partnership agreement created."
      );
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to create partnership agreement."
      );
    } finally {
      setAgreementBusy(false);
    }
  };

  const sendAgreement = async () => {
    try {
      setAgreementBusy(true);
      const response = await api.post(
        `/partnership/admin/${hotelId}/agreement/send`
      );
      setMessage(response.data?.message || "Agreement sent.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to send agreement."
      );
    } finally {
      setAgreementBusy(false);
    }
  };

  const verifyAgreement = async () => {
    try {
      setAgreementBusy(true);
      const response = await api.post(
        `/partnership/admin/${hotelId}/agreement/verify`
      );
      setMessage(response.data?.message || "Agreement verified.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to verify agreement."
      );
    } finally {
      setAgreementBusy(false);
    }
  };

  const downloadAgreement = async () => {
    const agreement = data?.agreement;
    if (!agreement?._id) return;

    try {
      const response = await api.get(
        `/partnership/agreements/${agreement._id}/pdf`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${agreement.agreementNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to download agreement."
      );
    }
  };

  if (loading)
    return (
      <main className="min-h-screen pt-24 px-6">
        <div className="card-ambient p-8 animate-pulse">
          Loading partner record...
        </div>
      </main>
    );

  const hotel = data?.hotel;
  const agreement = data?.agreement;

  if (!hotel)
    return (
      <main className="min-h-screen pt-24 px-6">
        {message || "Hotel not found."}
      </main>
    );

  return (
    <main className="min-h-screen bg-surface-cream pt-24 pb-16 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-6xl mx-auto">
        <Link to="/admin/hotels" className="text-secondary">
          ← Hotel Applications
        </Link>

        <div className="mt-4 mb-6">
          <span className="badge-gold">Compliance Review</span>
          <h1 className="font-headline-lg text-text-deep-green mt-2">
            {hotel.hotelName}
          </h1>
          <p className="text-on-surface-variant">
            {hotel.application?.applicationNumber || hotel._id} ·{" "}
            {hotel.owner?.email || hotel.email}
          </p>
        </div>

        {message && (
          <div className="mb-4 card-ambient p-4">{message}</div>
        )}

        <section className="card-ambient p-5 md:p-6 mb-5">
          <div className="flex flex-wrap gap-3 items-start justify-between">
            <div>
              <span className="badge-gold">Agreement Engine</span>
              <h2 className="font-headline-md text-text-deep-green mt-2">
                Commercial Partnership Agreement
              </h2>
              <p className="text-on-surface-variant mt-1">
                Generate versioned commercial terms, send them to the hotel
                and verify the signed copy before activation.
              </p>
            </div>
            {agreement && (
              <span className="status-pill bg-surface-container-low capitalize">
                {humanize(agreement.status)}
              </span>
            )}
          </div>

          <div className="mt-5 grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="font-label-sm">Commission %</span>
              <input
                className="form-input w-full mt-1"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(event) =>
                  setCommissionRate(event.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="font-label-sm">Settlement cycle</span>
              <select
                className="form-select w-full mt-1"
                value={settlementCycle}
                onChange={(event) =>
                  setSettlementCycle(event.target.value)
                }
              >
                <option>Weekly</option>
                <option>Biweekly</option>
                <option>Monthly</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                className="btn-primary w-full"
                disabled={agreementBusy}
                onClick={createAgreement}
              >
                {agreement ? "Create New Version" : "Generate Agreement"}
              </button>
            </div>
          </div>

          {agreement && (
            <div className="mt-5 rounded-xl border border-border-subtle p-4 bg-white">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-on-surface-variant">Agreement</span>
                  <strong className="block text-text-deep-green">
                    {agreement.agreementNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-on-surface-variant">Version</span>
                  <strong className="block">{agreement.version}</strong>
                </div>
                <div>
                  <span className="text-on-surface-variant">Commission</span>
                  <strong className="block">
                    {agreement.terms?.platformCommissionRate}%
                  </strong>
                </div>
                <div>
                  <span className="text-on-surface-variant">
                    Terms fingerprint
                  </span>
                  <strong className="block truncate" title={agreement.termsHash}>
                    {agreement.termsHash?.slice(0, 16)}…
                  </strong>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-outline" onClick={downloadAgreement}>
                  Download PDF
                </button>
                <button
                  className="btn-outline"
                  disabled={agreementBusy}
                  onClick={sendAgreement}
                >
                  Send Agreement
                </button>
                <button
                  className="btn-primary"
                  disabled={agreementBusy}
                  onClick={verifyAgreement}
                >
                  Verify Signed Agreement
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-[1fr_.9fr] gap-5">
          <section className="card-ambient p-5 md:p-6">
            <h2 className="font-headline-md text-text-deep-green">
              Documents
            </h2>

            <div className="mt-4 space-y-3">
              {(data.documents || []).map((doc) => (
                <div className="df-document-row" key={doc._id}>
                  <div>
                    <strong>{humanize(doc.documentType)}</strong>
                    <small>
                      {doc.originalName} · {Math.ceil(doc.size / 1024)} KB
                    </small>
                  </div>

                  <div>
                    <span className="status-pill bg-surface-container-low">
                      {doc.status}
                    </span>
                    <button
                      type="button"
                      className="text-secondary hover:underline"
                      onClick={() => downloadDocument(doc)}
                    >
                      Open
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="btn-outline"
                      onClick={() => reviewDoc(doc._id, "verified")}
                    >
                      Verify
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => reviewDoc(doc._id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>

                  {doc.reviewNote && <p>{doc.reviewNote}</p>}
                </div>
              ))}

              {!data.documents?.length && (
                <p className="text-on-surface-variant py-5">
                  No documents submitted.
                </p>
              )}
            </div>
          </section>

          <section className="card-ambient p-5 md:p-6">
            <h2 className="font-headline-md text-text-deep-green">
              Partnership decision
            </h2>

            <label className="block mt-4">
              <span className="font-label-sm">Status</span>
              <select
                className="form-select w-full mt-1"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {humanize(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mt-4">
              <span className="font-label-sm">Partner message</span>
              <textarea
                className="form-input w-full mt-1 min-h-[110px]"
                value={partnerMessage}
                onChange={(event) =>
                  setPartnerMessage(event.target.value)
                }
              />
            </label>

            <label className="block mt-4">
              <span className="font-label-sm">
                Internal Admin note — never shown to hotel
              </span>
              <textarea
                className="form-input w-full mt-1 min-h-[110px]"
                value={internalNote}
                onChange={(event) =>
                  setInternalNote(event.target.value)
                }
              />
            </label>

            <button
              className="btn-primary w-full mt-4"
              onClick={saveStatus}
            >
              Save decision
            </button>

            <p className="text-xs text-on-surface-variant mt-3">
              Active status requires the latest agreement to be verified
              server-side. Frontend requests cannot bypass this control.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
