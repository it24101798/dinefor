import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import CrewArt from "../design/CrewArt";
import ApplicationMap from "./ApplicationMap";
import { downloadEvidence, problem, route } from "./onboardingApi";
import { districts, evidenceFields, reviewFields, statusLabel, steps, towns } from "./onboardingFields";
import "./onboarding.css";

const labels = new Map(reviewFields);
const key = "dineforHotelInvitation";

function readInvitation() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get("invitation");
  if (token) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    try { window.sessionStorage.setItem(key, token); } catch { /* This visit can continue without session storage. */ }
    return token;
  }
  try { return window.sessionStorage.getItem(key) || ""; } catch { return ""; }
}

export default function HotelInvitation() {
  const [token, setToken] = useState("");
  const [checkedToken, setCheckedToken] = useState(false);
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState({});
  const [step, setStep] = useState(0);
  const [secret, setSecret] = useState({ bankNumber: "", bankConfirmation: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const heading = useRef(null);
  const lock = useRef(false);
  const headers = { "X-Hotel-Invitation": token };
  const editable = ["draft", "changes_requested"].includes(record?.status);

  useEffect(() => { const value = readInvitation(); if (value) setToken(value); setCheckedToken(true); }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError("");
    api.get(route + "/application", { headers: { "X-Hotel-Invitation": token }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setRecord(data);
        setDraft(current => Object.keys(current).length && reload ? current : {
          tradingName: data.hotelName, contactName: data.contactName, ...data.application,
        });
      }).catch(error => {
        if (!controller.signal.aborted) setError(problem(error));
      });
    return () => controller.abort();
  }, [token, reload]);

  function setField(name, value) {
    setDraft(current => name === "province" ? { ...current, province: value, district: "", city: "" }
      : name === "district" ? { ...current, district: value, city: "" }
      : { ...current, [name]: value });
  }

  async function run(operation, message) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      if (message) setNotice(message);
      return true;
    } catch (error) {
      setError(problem(error));
      if (error.response?.status === 409) setReload(value => value + 1);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function save(submit = false) {
    const saved = await run(async () => {
      const { data } = await api.put(route + "/application", {
        application: { ...draft, termsVersion: record.termsVersion }, revision: record.revision, ...secret, submit,
      }, { headers });
      setRecord(data);
      setSecret({ bankNumber: "", bankConfirmation: "" });
    }, submit ? "Application sent for review." : "Draft saved.");
    if (saved && submit) window.scrollTo(0, 0);
    return saved;
  }

  function moveTo(value) {
    setStep(value);
    window.requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    window.scrollTo(0, 0);
  }

  function upload(kind, file) {
    if (!file) return;
    return run(async () => {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post(route + "/application/evidence/" + kind, body, { headers });
      setRecord(data);
    }, "Evidence uploaded.");
  }

  function renderField([name, label, type = "text"]) {
    const options = name === "province" ? Object.keys(districts) : name === "district" ? districts[draft.province] || [] : null;
    return <label key={name}>{label}
      {options ? <select value={draft[name] || ""} onChange={e => setField(name, e.target.value)}><option value="">Choose {label.toLowerCase()}</option>{options.map(option => <option key={option}>{option}</option>)}</select>
        : name === "address" ? <textarea rows="2" maxLength={350} value={draft[name] || ""} onChange={e => setField(name, e.target.value)} />
        : name === "city" ? <><input list="df11-town-options" maxLength={180} value={draft.city || ""} onChange={e => setField("city", e.target.value)} />
          <datalist id="df11-town-options">{[...new Set([draft.district, ...(towns[draft.district] || [])].filter(Boolean))].map(town => <option key={town} value={town} />)}</datalist></>
        : <input type={type} min={type === "number" ? 0 : undefined} max={type === "number" ? 100000 : undefined} maxLength={180} value={draft[name] ?? ""}
          onChange={e => setField(name, type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} />}
    </label>;
  }

  return <main className="df11 df11-narrow">
    <Link className="df11-back" to="/for-hotels">← For hotels</Link>
    <header className="df11-hero"><div><h1>Hotel application</h1><p>{record?.hotelName || "Open the invitation sent to your work email to begin."}</p></div><CrewArt role="host" /></header>
    {notice && <p className="df11-notice" role="status">{notice}</p>}
    {error && <p className="df11-error" role="alert">{error}</p>}
    {(!checkedToken || token && !record && !error) && <p role="status">Checking your invitation…</p>}
    {checkedToken && (!token || error && !record) && <section className="df11-card df11-form"><h2>Need a new invitation?</h2>
      <p>Use the link in your work email to resume a draft or see its review status.</p><Link to="/hotel-enquiry">Contact DineFor</Link>
    </section>}
    {record && <section className="df11-card df11-form">
      <p><strong>{statusLabel(record.status)}</strong></p><p>Sign-in email for this application: <strong>{record.email}</strong></p>
      {record.reviewNote && <p>{record.reviewNote}</p>}
      {record.status === "changes_requested" && <ul className="df11-corrections">{Object.entries(record.corrections || {}).map(([field, note]) => <li key={field}><strong>{labels.get(field) || field}</strong><p>{note}</p></li>)}</ul>}
      {!editable && <p>{record.status === "approved" ? "DineFor will contact you at your work email with the next steps." : record.status === "rejected" ? "Contact DineFor if you have questions about this decision." : "DineFor is reviewing your application. You can reopen your invitation to see updates."}</p>}
    </section>}
    {editable && <>
      <ol className="df11-steps" aria-label="Application steps">{steps.map(({ name }, index) => <li key={name}>
        <button type="button" disabled={busy} aria-current={index === step ? "step" : undefined} onClick={() => moveTo(index)}>{index + 1}. {name}</button>
      </li>)}</ol>
      <fieldset className="df11-card df11-form" disabled={busy}>
        <h2 ref={heading} tabIndex="-1">{steps[step].name}</h2>
        <div className="df11-grid">{steps[step].fields.map(renderField)}</div>
        {step === 1 && <ApplicationMap pin={draft.pin} setPin={pin => setField("pin", pin)} address={[draft.address, draft.city, draft.district, "Sri Lanka"].filter(Boolean).join(", ")} disabled={busy} />}
        {step === 4 && <>
          {record.accountLast4 && <p>Saved settlement account ending in {record.accountLast4}. Enter and confirm a new number to replace it.</p>}
          <div className="df11-grid">{[["bankNumber", "Account number"], ["bankConfirmation", "Confirm account number"]].map(([field, label]) => <label key={field}>{label}<input type="password" inputMode="numeric" autoComplete="off" maxLength={32} value={secret[field]} onChange={e => setSecret(current => ({ ...current, [field]: e.target.value }))} /></label>)}</div>
          <p>Upload only the requested proof. DineFor never asks for your password, bank PIN, or OTP.</p>
        </>}
        {step === 5 && <>
          <h3>Application summary</h3>
          <dl className="df11-summary">{steps.flatMap(item => item.fields).map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{draft[field] ?? "—"}</dd></div>)}</dl>
          <p>Settlement account {record.accountLast4 ? `ending in ${record.accountLast4}` : "pending"}</p>
          <h3>Private evidence</h3>
          <p>One PDF, JPG or PNG up to 5 MB per item. The property photo must be JPG or PNG.</p>
          {evidenceFields.map(([field, label]) => {
            const file = record.evidence?.find(item => item.kind === field);
            return <div className="df11-evidence" key={field}>
              <label>{label}<input type="file" accept={field === "photo" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"} onChange={e => { upload(field, e.target.files[0]); e.target.value = ""; }} /></label>
              {file && <button type="button" className="df11-button secondary" onClick={() => run(() => downloadEvidence(`/application/evidence/${file._id}`, file, headers))}>Download {file.name}</button>}
            </div>;
          })}
          <details><summary>Privacy notice and application declaration ({record.termsVersion})</summary>
            <p>DineFor uses your application and evidence to verify eligibility, contact your representative and prepare your settlement account. Authorised reviewers can access submitted evidence. Contact DineFor to request access or correction.</p>
            <p>By applying, you confirm your authority to represent the business and the accuracy of the details provided. The partnership offer letter is issued separately after approval.</p>
          </details>
          {[
            ["privacyAccepted", "I have read the privacy notice."],
            ["photoPermission", "I have permission to submit this photo for verification and publication if approved."],
            ["termsAccepted", "I confirm the application declaration."],
            ["marketingOptIn", "Send me partner news by email (optional)."],
          ].map(([name, label]) => <label className="df11-check" key={name}><input type="checkbox" checked={draft[name] === true} onChange={e => setField(name, e.target.checked)} />{label}</label>)}
        </>}
      </fieldset>
      <div className="df11-actions">
        {step > 0 && <button type="button" disabled={busy} className="df11-button secondary" onClick={() => moveTo(step - 1)}>Back</button>}
        <button type="button" disabled={busy} className="df11-button secondary" onClick={() => save()}>Save draft</button>
        {step < steps.length - 1 ? <button type="button" disabled={busy} className="df11-button" onClick={() => moveTo(step + 1)}>Continue</button>
          : <button type="button" disabled={busy} className="df11-button" onClick={() => save(true)}>{busy ? "Working…" : record.status === "changes_requested" ? "Resubmit application" : "Submit application"}</button>}
      </div>
      {error && <p className="df11-error">{error}</p>}
    </>}
  </main>;
}
