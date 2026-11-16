const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const { HotelOnboarding: Lead, HotelOnboardingEvidence: Evidence } = require("../models/HotelOnboarding");
const ActivityLog = require("../models/ActivityLog");
const Hotel = require("../models/Hotel");
const User = require("../models/User");
const { sendMail } = require("../services/emailService");
const d = require("../services/onboardingData");

const days = value => value * 86_400_000;
const objectId = value => {
  if (!mongoose.isValidObjectId(value)) throw d.err(404, "Application or evidence not found.");
  return value;
};

function applicantView(record) {
  return {
    email: record.email, hotelName: record.hotelName, contactName: record.contactName,
    status: record.status, revision: record.revision, application: record.application,
    accountLast4: record.accountLast4, evidence: record.evidence, corrections: record.corrections,
    reviewNote: record.reviewNote, provisionedAt: record.provisionedAt, termsVersion: d.TERMS_VERSION,
  };
}

function adminView(record) {
  const { encryptedAccount, invitationHash, bankChange, ...visible } = record;
  return { ...visible, bankChange: bankView(bankChange) };
}

function bankView(change) {
  if (!change?.status) return null;
  const { encryptedAccount, ...view } = change;
  return view;
}

function log(req, record, action, metadata = {}, session) {
  const entry = { actor: req.user?._id, actorRole: req.user?.role || "system", action, entityType: "hotel_onboarding", entityId: record._id, metadata };
  return session ? ActivityLog.create([entry], { session }) : ActivityLog.create(entry);
}

async function transaction(operation) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => operation(session));
  } finally {
    await session.endSession();
  }
}

const noLongerEditable = () => d.err(409, "This application changed. Reload and review its current status.");
const findApplication = async id => {
  const record = await Lead.findById(objectId(id)).lean();
  if (!record) throw d.err(404, "Application not found.");
  return record;
};

function publicBase() {
  const destination = process.env.CLIENT_URL || (process.env.NODE_ENV === "production" ? "https://dinefor.com" : "http://localhost:5173");
  return new URL(destination).origin;
}

function leadFields(body, admin) {
  const data = {
    hotelName: d.clean(body.hotelName), contactName: d.clean(body.contactName), email: d.safeEmail(body.email), phone: d.clean(body.phone, 24),
  };
  if (!data.hotelName || !data.contactName || !d.emailValid(data.email)) throw d.err(400, "Hotel name, contact and work email are required.");
  if (admin) {
    data.leadNotes = d.clean(body.leadNotes, 2000);
    if (body.followUpAt) {
      const date = new Date(body.followUpAt);
      if (Number.isNaN(date.getTime())) throw d.err(400, "Choose a valid follow-up date.");
      data.followUpAt = date;
    }
  } else {
    data.leadNotes = d.clean(body.message, 1200);
  }
  return data;
}

async function saveLead(req, res, admin) {
  const values = leadFields(req.body, admin);
  try {
    const record = await Lead.create(values);
    return res.status(201).json(admin ? { id: record._id } : { message: "Thanks for your enquiry. DineFor will review your details and contact you." });
  } catch (error) {
    if (error.code !== 11000) throw error;
    if (admin) throw d.err(409, "A lead already uses this work email.");
    return res.status(200).json({ message: "Thanks for your enquiry. DineFor will review your details and contact you." });
  }
}

exports.enquiry = (req, res) => saveLead(req, res, false);
exports.createLead = (req, res) => saveLead(req, res, true);
exports.listLeads = async (req, res) => {
  const rows = await Lead.find().select("hotelName contactName email status invitationSentAt invitationExpiresAt invitationRevokedAt followUpAt hotel").sort({ updatedAt: -1 }).limit(200).lean();
  return res.json(rows);
};
exports.getLead = async (req, res) => res.json(adminView(await findApplication(req.params.id)));

exports.updateLead = async (req, res) => {
  const id = objectId(req.params.id);
  const followUpAt = req.body.followUpAt ? new Date(req.body.followUpAt) : null;
  if (Number.isNaN(followUpAt?.getTime())) throw d.err(400, "Choose a valid follow-up date.");
  const record = await Lead.findByIdAndUpdate(id, { leadNotes: d.clean(req.body.leadNotes, 2000), followUpAt }, { new: true }).lean();
  if (!record) throw d.err(404, "Lead not found.");
  return res.json(adminView(record));
};

exports.sendInvite = async (req, res) => {
  const id = objectId(req.params.id);
  const record = await findApplication(id);
  if (!["lead", "draft", "changes_requested", ...d.reviewStatuses, "approved"].includes(record.status) || record.hotel) throw d.err(409, "An invitation cannot be issued in this status.");
  const token = randomBytes(32).toString("base64url");
  const invitationHash = d.hashInvitation(token);
  const now = new Date();
  const issued = await Lead.findOneAndUpdate({
    _id: id, revision: record.revision, status: record.status, hotel: { $exists: false },
  }, {
    $set: { invitationHash, invitationExpiresAt: new Date(now.getTime() + days(7)), invitationRevokedAt: null, invitationSentAt: null,
      status: record.status === "lead" ? "draft" : record.status },
    $inc: { revision: 1 },
  }, { new: true });
  if (!issued) throw noLongerEditable();
  const url = new URL("/hotel-invitation", publicBase());
  url.hash = new URLSearchParams({ invitation: token }).toString();
  try {
    const result = await sendMail({
      to: issued.email, subject: "Your DineFor hotel invitation",
      text: `Hello ${issued.contactName},\n\nDineFor has invited ${issued.hotelName} to apply. Open this link within seven days to start or resume your application:\n${url.href}\n\nKeep this link private. DineFor never asks you for an OTP, password or bank PIN.`,
    });
    if (!result.accepted?.length) throw new Error("SMTP did not accept the invitation");
  } catch {
    await Lead.updateOne({ _id: id, invitationHash }, { $unset: { invitationHash: 1 }, $set: { invitationRevokedAt: new Date() } });
    throw d.err(503, "The invitation email could not be sent. Check the SMTP settings and try again.");
  }
  const updated = await Lead.findOneAndUpdate({ _id: id, invitationHash }, { invitationSentAt: new Date() }, { new: true }).lean();
  if (!updated) throw d.err(409, "The invitation was replaced or revoked while it was being sent.");
  await log(req, issued, "hotel_invitation_sent");
  return res.json(adminView(updated));
};

exports.revokeInvite = async (req, res) => {
  const record = await Lead.findByIdAndUpdate(objectId(req.params.id), {
    $unset: { invitationHash: 1 }, $set: { invitationRevokedAt: new Date() }, $inc: { revision: 1 },
  }, { new: true }).lean();
  if (!record) throw d.err(404, "Lead not found.");
  await log(req, record, "hotel_invitation_revoked");
  return res.json(adminView(record));
};

exports.requireInvitation = async (req, res, next) => {
  const token = req.get("X-Hotel-Invitation");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || "")) throw d.err(401, "Open the invitation from your work email.");
  const query = { invitationHash: d.hashInvitation(token), invitationExpiresAt: { $gt: new Date() }, invitationRevokedAt: null, invitationSentAt: { $ne: null } };
  const record = await Lead.findOne(query).lean();
  if (!record) throw d.err(401, "This invitation is invalid, expired or revoked. Contact DineFor for a new invitation.");
  req.applicant = { record, query };
  next();
};

exports.getApplication = (req, res) => res.json(applicantView(req.applicant.record));

function writable(req) {
  const { record, query } = req.applicant;
  if (!d.editableStatuses.includes(record.status)) throw noLongerEditable();
  return { _id: record._id, ...query, status: record.status, revision: record.revision };
}

exports.saveApplication = async (req, res) => {
  const filter = writable(req);
  const { record } = req.applicant;
  if (req.body.revision !== record.revision) throw noLongerEditable();
  const application = d.applicationFrom(req.body.application || {});
  const update = { application };
  if (req.body.bankNumber || req.body.bankConfirmation) {
    const number = d.verifyBankNumber(req.body.bankNumber, req.body.bankConfirmation);
    update.accountLast4 = number.slice(-4);
    update.encryptedAccount = d.sealBank(number, record._id);
  }
  if (req.body.submit === true) {
    d.validateSubmission(application, record.evidence, update.accountLast4 || record.accountLast4);
    update.status = record.status === "changes_requested" ? "resubmitted" : "submitted";
    application.acceptedAt = new Date();
  }
  const updated = await Lead.findOneAndUpdate(filter, { $set: update, $inc: { revision: 1 } }, { new: true }).lean();
  if (!updated) throw noLongerEditable();
  return res.json(applicantView(updated));
};

async function attach(file, kind, applicationId, session) {
  const meta = { _id: new mongoose.Types.ObjectId(), ...d.appearance(file, kind), createdAt: new Date() };
  const encryption = d.encrypt(file.buffer, `evidence:${applicationId}:${meta._id}`);
  await Evidence.create([{ _id: meta._id, application: applicationId, ...encryption }], { session });
  return meta;
}

exports.uploadEvidence = async (req, res) => {
  const filter = writable(req);
  const { record } = req.applicant;
  const { kind } = req.params;
  if (!["registration", "authority", "bank", "photo"].includes(kind)) throw d.err(400, "Unknown evidence type.");
  const updated = await transaction(async session => {
    const file = await attach(req.file, kind, record._id, session);
    const other = record.evidence.filter(item => item.kind !== kind);
    const application = await Lead.findOneAndUpdate(filter, { $set: { evidence: [...other, file] }, $inc: { revision: 1 } }, { new: true, session }).lean();
    if (!application) throw noLongerEditable();
    const old = record.evidence.find(item => item.kind === kind);
    if (old) await Evidence.deleteOne({ _id: old._id, application: record._id }, { session });
    return application;
  });
  return res.status(201).json(applicantView(updated));
};

exports.downloadEvidence = async (req, res) => {
  const record = req.applicant?.record || await findApplication(req.params.id);
  const id = objectId(req.params.evidenceId);
  const allowed = req.applicant ? record.evidence : [...record.evidence, record.bankChange?.evidence, record.verifiedBankEvidence];
  const meta = allowed.find(item => String(item?._id) === id);
  if (!meta) throw d.err(404, "Evidence not found.");
  const data = await Evidence.findOne({ _id: id, application: record._id }).select("+ciphertext +iv +tag");
  if (!data) throw d.err(404, "Evidence not found.");
  await log(req, record, "hotel_onboarding_evidence_downloaded", { evidenceId: id, kind: meta.kind });
  const extension = { "image/png": "png", "image/jpeg": "jpg", "application/pdf": "pdf" }[meta.mime];
  res.attachment(`${meta.kind}.${extension}`).set("Content-Type", meta.mime).set("X-Content-Type-Options", "nosniff");
  return res.send(d.decrypt(data, `evidence:${record._id}:${id}`));
};

exports.revealAccount = async (req, res) => {
  const record = await Lead.findById(objectId(req.params.id)).select("+encryptedAccount +bankChange.encryptedAccount").lean();
  if (!["pending", "current"].includes(req.params.target)) throw d.err(404, "Account details are unavailable.");
  const pending = req.params.target === "pending";
  const value = pending ? record?.bankChange?.status === "pending" && record.bankChange.encryptedAccount : record?.encryptedAccount;
  if (!value) throw d.err(404, "Account details are unavailable.");
  await log(req, record, "hotel_onboarding_account_viewed", { pending });
  return res.json({ accountNumber: d.openBank(value, record._id) });
};

exports.review = async (req, res) => {
  const record = await findApplication(req.params.id);
  if (!d.reviewStatuses.includes(record.status) || req.body.revision !== record.revision) throw noLongerEditable();
  const status = req.body.status;
  if (!["under_review", "changes_requested", "approved", "rejected"].includes(status)) throw d.err(400, "Choose a valid review decision.");
  const reviewNote = d.clean(req.body.note, 1200);
  const corrections = Object.fromEntries(Object.entries(req.body.corrections || {}).filter(([field, note]) => d.fields.has(field) && d.clean(note)).map(([field, note]) => [field, d.clean(note, 500)]));
  if (status === "changes_requested" && !Object.keys(corrections).length) throw d.err(400, "Add a correction for at least one field.");
  if (status === "rejected" && !reviewNote) throw d.err(400, "Add a reason for rejection.");
  if (status === "approved") {
    if (req.body.evidenceVerified !== true) throw d.err(400, "Verify the registration, representative and bank evidence before approving.");
    d.validateSubmission(record.application, record.evidence, record.accountLast4);
  }
  const updated = await transaction(async session => {
    const result = await Lead.findOneAndUpdate({ _id: record._id, status: record.status, revision: record.revision }, {
      $set: { status, corrections, reviewNote, reviewedBy: req.user._id, reviewedAt: new Date() }, $inc: { revision: 1 },
    }, { new: true, session }).lean();
    if (!result) throw noLongerEditable();
    await log(req, result, "hotel_onboarding_review", { status }, session);
    return result;
  });
  return res.json(adminView(updated));
};

exports.provision = async (req, res) => {
  const record = await findApplication(req.params.id);
  if (record.hotel) return res.json(adminView(record));
  if (record.status !== "approved" || req.body.revision !== record.revision) throw noLongerEditable();
  const name = d.clean(req.body.accountName, 100);
  if (!name) throw d.err(400, "Enter the hotel account display name.");
  if (await User.exists({ email: record.email })) throw d.err(409, "This email already belongs to an account. Use a separate work email for hotel onboarding.");
  const password = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
  let updated;
  try {
    updated = await transaction(async session => {
      const current = await Lead.findById(record._id).session(session).lean();
      if (current?.hotel) return current;
      if (current?.status !== "approved" || current.revision !== record.revision) throw noLongerEditable();
      const data = current.application;
      const [user] = await User.create([{
        name, email: current.email, password, role: "hotel", authProvider: "local", isEmailVerified: true, emailVerifiedAt: new Date(),
      }], { session });
      const [hotel] = await Hotel.create([{
        owner: user._id, onboardingApplication: current._id, hotelName: data.tradingName, location: data.city,
        address: data.address, province: data.province, district: data.district, city: data.city, contactNumber: data.contactPhone, email: current.email,
        mapLocation: data.pin, paymentPolicy: { acceptedModes: ["full_payment"], settlementFrequency: "weekly" },
        application: {
          applicationNumber: `DFA-${String(current._id).slice(-8).toUpperCase()}`, legalBusinessName: data.legalName,
          businessRegistrationNumber: data.registrationNumber, termsAccepted: true, managerName: data.contactName,
          managerEmail: current.email, managerPhone: data.contactPhone, buffetCapacity: data.diningCapacity,
          hotelCategory: data.category || "Hotel", cuisineTypes: data.buffetCategories.split(",").map(item => item.trim()).filter(Boolean),
          accountHolderName: data.bankHolder, bankName: data.bankName, bankBranch: data.bankBranch, accountNumber: current.accountLast4,
          submittedAt: data.acceptedAt, reviewedAt: current.reviewedAt,
        },
        authorizedRepresentative: { name: data.representativeName, designation: data.representativeTitle, email: data.representativeEmail },
        compliance: { businessRegistrationVerified: true, representativeVerified: true, bankingVerified: true },
        status: "pending", partnershipStatus: "conditionally_approved", isApproved: false,
      }], { session });
      const result = await Lead.findOneAndUpdate({ _id: current._id, revision: current.revision, hotel: { $exists: false } }, {
        $set: { user: user._id, hotel: hotel._id, provisionedAt: new Date() }, $unset: { invitationHash: 1 }, $inc: { revision: 1 },
      }, { new: true, session }).lean();
      if (!result) throw noLongerEditable();
      await log(req, result, "hotel_account_provisioned", { hotelId: hotel._id }, session);
      return result;
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const repeated = await findApplication(record._id);
    if (repeated.hotel) return res.json(adminView(repeated));
    throw d.err(409, "The work email is already registered. Use a separate work email for the hotel account.");
  }
  return res.json(adminView(updated));
};

exports.sendSetup = async (req, res) => {
  const record = await findApplication(req.params.id);
  if (!record.hotel || !record.user) throw d.err(409, "Provision the hotel account first.");
  try {
    const result = await sendMail({
      to: record.email, subject: "Set up your DineFor hotel account",
      text: `Your hotel account is ready to set up. Visit ${publicBase()}/forgot-password and request an email verification code with the same work email. After verifying the code, choose your password and sign in to review your offer letter.\n\nNever send your code or password to anyone.`,
    });
    if (!result.accepted?.length) throw new Error();
  } catch {
    throw d.err(503, "The setup email could not be sent. Check SMTP and try again.");
  }
  await log(req, record, "hotel_setup_email_sent");
  return res.json({ message: "Account setup email sent." });
};

async function partnerRecord(req) {
  const record = await Lead.findOne({ user: req.user.id, hotel: { $exists: true } }).lean();
  if (!record) throw d.err(404, "Bank change requests are available for hotels onboarded through an invitation.");
  return record;
}

function partnerBankView(record) {
  const { bankHolder, bankName, bankBranch } = record.application;
  return { holder: bankHolder, bank: bankName, branch: bankBranch, last4: record.accountLast4, request: bankView(record.bankChange) };
}

exports.getBank = async (req, res) => res.json(partnerBankView(await partnerRecord(req)));
exports.requestBankChange = async (req, res) => {
  const record = await partnerRecord(req);
  if (record.bankChange?.status === "pending") throw d.err(409, "A bank change is already under review.");
  const { bankNumber, bankConfirmation } = req.body;
  const holder = d.clean(req.body.holder), bank = d.clean(req.body.bank), branch = d.clean(req.body.branch);
  if (!holder || !bank || !branch) throw d.err(400, "Account holder, bank and branch are required.");
  const number = d.verifyBankNumber(bankNumber, bankConfirmation);
  const updated = await transaction(async session => {
    const evidence = await attach(req.file, "bank", record._id, session);
    const change = { holder, bank, branch, last4: number.slice(-4), encryptedAccount: d.sealBank(number, record._id), evidence, status: "pending", requestedAt: new Date() };
    const result = await Lead.findOneAndUpdate({ _id: record._id, user: req.user.id, "bankChange.status": { $ne: "pending" } }, { $set: { bankChange: change }, $inc: { revision: 1 } }, { new: true, session }).lean();
    if (!result) throw noLongerEditable();
    const previous = record.bankChange?.evidence?._id;
    if (previous && String(previous) !== String(record.verifiedBankEvidence?._id)) await Evidence.deleteOne({ _id: previous, application: record._id }, { session });
    await log(req, result, "hotel_bank_change_requested", { evidenceId: evidence._id }, session);
    return result;
  });
  return res.status(201).json(partnerBankView(updated));
};

exports.reviewBankChange = async (req, res) => {
  const id = objectId(req.params.id);
  const approved = req.body.decision === "approved";
  if (!approved && req.body.decision !== "rejected") throw d.err(400, "Choose approve or reject.");
  if (approved && (req.body.evidenceVerified !== true || req.body.confirmedExistingContact !== true)) {
    throw d.err(400, "Verify the new bank evidence and confirm the request with the existing authorised contact first.");
  }
  const updated = await transaction(async session => {
    const record = await Lead.findById(id).select("+bankChange.encryptedAccount").session(session).lean();
    const change = record?.bankChange;
    if (!change || change.status !== "pending" || record.revision !== req.body.revision) throw noLongerEditable();
    const set = { "bankChange.status": req.body.decision, "bankChange.reviewedAt": new Date() };
    if (approved) {
      if (!change.encryptedAccount || !change.evidence?._id) throw d.err(409, "The bank change evidence is incomplete.");
      Object.assign(set, { accountLast4: change.last4, encryptedAccount: change.encryptedAccount, verifiedBankEvidence: change.evidence,
        "application.bankHolder": change.holder, "application.bankName": change.bank, "application.bankBranch": change.branch });
      const previousEvidence = record.verifiedBankEvidence?._id;
      if (previousEvidence) await Evidence.deleteOne({ _id: previousEvidence, application: id }, { session });
      const hotel = await Hotel.updateOne({ _id: record.hotel, owner: record.user }, { $set: {
        "application.bankName": change.bank, "application.bankBranch": change.branch,
        "application.accountHolderName": change.holder, "application.accountNumber": change.last4,
      } }, { session });
      if (!hotel.matchedCount) throw d.err(409, "The associated hotel profile could not be verified.");
    }
    const result = await Lead.findOneAndUpdate({ _id: id, revision: record.revision, "bankChange.status": "pending" }, {
      $set: set, $unset: { "bankChange.encryptedAccount": 1 }, $inc: { revision: 1 },
    }, { new: true, session }).lean();
    if (!result) throw noLongerEditable();
    await log(req, result, "hotel_bank_change_decided", { decision: req.body.decision }, session);
    return result;
  });
  return res.json(adminView(updated));
};
