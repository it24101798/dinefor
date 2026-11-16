import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { downloadEvidence, problem, route } from "./onboardingApi";
import { evidenceFields, reviewFields, statusLabel } from "./onboardingFields";
import "./onboarding.css";

const prefix = route + "/admin/leads";
const reviewable = ["submitted", "resubmitted", "under_review"];
const formatDate = value => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(new Date(value)) : "—";
const dateInput = value => value ? String(value).slice(0, 10) : "";
const evidenceNames = new Map(evidenceFields);
const stringValue = value => typeof value === "boolean" ? value ? "Yes" : "No" : value || value === 0 ? String(value) : "—";

function Leads({ data, run, reload }) {
  const [query, setQuery] = useState("");
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await run(async () => {
      await api.post(prefix, values);
      form.reset();
      reload();
    }, "Lead added.");
  }

  return <>
    <header className="df11-hero"><div><h1>Hotel onboarding</h1><p>Track enquiries, send invitations, and review applications.</p></div></header>
    <div className="df11-columns">
      <section className="df11-card df11-form">
        <h2>Hotel leads</h2>
        <label>Search leads<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
        {data ? <ul className="df11-items">{data.filter(lead => [lead.hotelName, lead.email, lead.status].join(" ").toLowerCase().includes(query.toLowerCase())).map(lead =>
          <li key={lead._id}><Link to={`/admin/hotel-onboarding/${lead._id}`}>{lead.hotelName}</Link><span>{statusLabel(lead.status)} · {lead.email}</span></li>)}</ul>
          : <p role="status">Loading hotel leads…</p>}
        {data?.length === 0 && <p>No enquiries yet.</p>}
      </section>
      <form className="df11-card df11-form" onSubmit={create}>
        <h2>Add a lead</h2>
        <label>Hotel name<input name="hotelName" required maxLength={180} /></label>
        <label>Contact name<input name="contactName" required maxLength={180} /></label>
        <label>Work email<input name="email" type="email" required maxLength={254} /></label>
        <label>Work phone (optional)<input name="phone" type="tel" maxLength={24} /></label>
        <label>Follow-up date<input name="followUpAt" type="date" /></label>
        <label>Lead notes<textarea name="leadNotes" rows="3" maxLength={2000} /></label>
        <button className="df11-button" type="submit">Add lead</button>
      </form>
    </div>
  </>;
}

function Lead({ record, run, update }) {
  const [corrections, setCorrections] = useState({});
  const [correctionField, setCorrectionField] = useState("legalName");
  const [note, setNote] = useState("");
  const [correctionText, setCorrectionText] = useState("");
  const [verified, setVerified] = useState(false);
  const [confirmedContact, setConfirmedContact] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [reveal, setReveal] = useState("");
  const [accountName, setAccountName] = useState(record.application?.representativeName || record.contactName);
  const root = `/admin/leads/${record._id}`;
  const application = record.application || {};
  const action = (path, body, message) => run(async () => {
    const response = await api.post(route + root + path, body);
    if (response.data._id) update(response.data);
    setReveal("");
  }, message);
  const review = status => action("/review", { revision: record.revision, status, note, corrections, evidenceVerified: verified }, "Decision saved.");
  const viewNumber = target => run(async () => {
    const { data } = await api.get(route + root + "/account/" + target);
    setReveal(data.accountNumber);
  });
  const evidence = file => run(() => downloadEvidence(root + "/evidence/" + file._id, file));
  const change = record.bankChange;

  return <>
    <header className="df11-hero"><div><h1>{record.hotelName}</h1><p>{statusLabel(record.status)} · {record.email}</p></div></header>
    <div className="df11-columns">
      <div className="df11-form">
        <section className="df11-card df11-form">
          <h2>Lead and invitation</h2>
          <p>{record.contactName}{record.phone ? ` · ${record.phone}` : ""}</p>
          <p>Invitation sent {formatDate(record.invitationSentAt)}. Expires {formatDate(record.invitationExpiresAt)}.</p>
          {record.invitationRevokedAt && <p>This invitation was revoked.</p>}
          <form className="df11-form" key={`${record.leadNotes}:${record.followUpAt}`} onSubmit={event => {
            event.preventDefault();
            const body = Object.fromEntries(new FormData(event.currentTarget));
            run(async () => update((await api.patch(route + root, body)).data), "Follow-up saved.");
          }}>
            <label>Lead notes<textarea name="leadNotes" rows="3" maxLength={2000} defaultValue={record.leadNotes || ""} /></label>
            <label>Follow-up date<input name="followUpAt" type="date" defaultValue={dateInput(record.followUpAt)} /></label>
            <button className="df11-button secondary" type="submit">Save lead notes</button>
          </form>
          {!record.hotel && record.status !== "rejected" && <div className="df11-actions">
            <button type="button" className="df11-button" onClick={() => action("/invite", {}, "Invitation sent. Any previous link has been replaced.")}>{record.invitationSentAt ? "Send a new invitation" : "Send invitation"}</button>
            {record.invitationSentAt && !record.invitationRevokedAt && <button type="button" className="df11-button danger" onClick={() => action("/revoke", {}, "Invitation revoked.")}>Revoke invitation</button>}
          </div>}
        </section>
        {Object.keys(application).length > 0 && <section className="df11-card df11-form">
          <h2>Application and private evidence</h2>
          <dl className="df11-summary">{reviewFields.filter(([key]) => Object.hasOwn(application, key) && key !== "pin").map(([key, label]) =>
            <div key={key}><dt>{label}</dt><dd>{stringValue(application[key])}</dd></div>)}
            {application.pin && <div><dt>Map pin</dt><dd>{application.pin.latitude}, {application.pin.longitude}</dd></div>}
            <div><dt>Application declaration</dt><dd>{application.termsVersion || "—"}</dd></div>
          </dl>
          <ul className="df11-items">{record.evidence?.map(file => <li key={file._id}><span>{evidenceNames.get(file.kind)} · {file.name}</span><button type="button" className="df11-button secondary" onClick={() => evidence(file)}>Download evidence</button></li>)}</ul>
          {record.accountLast4 && <>
            <p>Verified or submitted account ending in {record.accountLast4}.</p>
            <button type="button" className="df11-button secondary" onClick={() => viewNumber("current")}>View account number (audited)</button>
          </>}
          {reveal && <p className="df11-notice">Account number <strong>{reveal}</strong> <button type="button" onClick={() => setReveal("")}>Hide</button></p>}
        </section>}
      </div>
      <div className="df11-form">
        {reviewable.includes(record.status) && <section className="df11-card df11-form">
          <h2>Review decision</h2>
          <label>Message to applicant<textarea rows="3" maxLength={1200} value={note} onChange={e => setNote(e.target.value)} /></label>
          <label>Field needing correction<select value={correctionField} onChange={e => setCorrectionField(e.target.value)}>{reviewFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Correction requested<textarea rows="2" maxLength={500} value={correctionText} onChange={e => setCorrectionText(e.target.value)} /></label>
          <button type="button" className="df11-button secondary" disabled={!correctionText.trim()} onClick={() => { setCorrections(prev => ({ ...prev, [correctionField]: correctionText.trim() })); setCorrectionText(""); }}>Add field correction</button>
          <ul className="df11-corrections">{Object.entries(corrections).map(([field, text]) => <li key={field}>{new Map(reviewFields).get(field)} · {text}
            <button type="button" onClick={() => setCorrections(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field)))}>Remove</button>
          </li>)}</ul>
          <label className="df11-check"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />I verified the business registration, representative and bank evidence.</label>
          <div className="df11-actions">
            {record.status !== "under_review" && <button type="button" className="df11-button secondary" onClick={() => review("under_review")}>Mark under review</button>}
            <button type="button" className="df11-button secondary" disabled={!Object.keys(corrections).length} onClick={() => review("changes_requested")}>Request corrections</button>
            <button type="button" className="df11-button" disabled={!verified} onClick={() => review("approved")}>Approve application</button>
            <button type="button" className="df11-button danger" disabled={!note.trim()} onClick={() => review("rejected")}>Reject application</button>
          </div>
        </section>}
        {record.status === "approved" && <section className="df11-card df11-form">
          <h2>Hotel account and agreement</h2>
          {record.hotel ? <>
            <p>Hotel owner account created. The offer letter is managed in Partnership review.</p>
            <button type="button" className="df11-button secondary" onClick={() => action("/setup", {}, "Account setup email sent.")}>Send account setup email</button>
            <Link className="df11-button" to={`/admin/partnership/${record.hotel}`}>Manage offer letter</Link>
          </> : <>
            <label>Account display name<input maxLength={100} value={accountName} onChange={e => setAccountName(e.target.value)} /></label>
            <p>Login email {record.email}. Role Hotel owner.</p>
            <button type="button" className="df11-button" disabled={!accountName.trim()} onClick={() => action("/provision", { revision: record.revision, accountName }, "Hotel owner account created.")}>Create hotel account</button>
          </>}
        </section>}
        {change && <section className="df11-card df11-form">
          <h2>Settlement account change</h2>
          <p>{change.bank}, {change.branch} · {change.holder} · ending in {change.last4}</p>
          <p>Status {change.status}</p>
          {change.evidence && <button type="button" className="df11-button secondary" onClick={() => evidence(change.evidence)}>Download new bank evidence</button>}
          {change.status === "pending" && <>
            <button type="button" className="df11-button secondary" onClick={() => viewNumber("pending")}>View new account number (audited)</button>
            <label className="df11-check"><input type="checkbox" checked={bankVerified} onChange={e => setBankVerified(e.target.checked)} />New bank evidence verified</label>
            <label className="df11-check"><input type="checkbox" checked={confirmedContact} onChange={e => setConfirmedContact(e.target.checked)} />Confirmed with the existing authorised contact</label>
            <div className="df11-actions">
              <button type="button" className="df11-button" disabled={!bankVerified || !confirmedContact} onClick={() => action("/bank-review", { decision: "approved", revision: record.revision, evidenceVerified: bankVerified, confirmedExistingContact: confirmedContact }, "Bank change approved.")}>Approve bank change</button>
              <button type="button" className="df11-button danger" onClick={() => action("/bank-review", { decision: "rejected", revision: record.revision }, "Bank change rejected.")}>Reject bank change</button>
            </div>
          </>}
        </section>}
      </div>
    </div>
  </>;
}

export default function AdminHotelOnboarding() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setNotice("");
    setError("");
    api.get(id ? prefix + "/" + id : prefix, { signal: ctrl.signal }).then(({ data }) => setData(data)).catch(error => {
      if (!ctrl.signal.aborted) setError(problem(error));
    });
    return () => ctrl.abort();
  }, [id, attempt]);

  async function run(task, message) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      if (message) setNotice(message);
    } catch (error) { setError(problem(error)); }
    finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <main className="df11">
    <Link className="df11-back" to={id ? "/admin/hotel-onboarding" : "/admin/hotels"}>← {id ? "Hotel leads" : "Hotel applications"}</Link>
    {notice && <p role="status" className="df11-notice">{notice}</p>}
    {error && <p role="alert" className="df11-error">{error}</p>}
    <fieldset disabled={busy} className="df11-flow">
      {id ? data?._id === id ? <Lead key={id} record={data} run={run} update={setData} /> : !error && <p role="status">Loading application…</p>
        : <Leads data={Array.isArray(data) ? data : null} run={run} reload={() => setAttempt(value => value + 1)} />}
    </fieldset>
  </main>;
}
