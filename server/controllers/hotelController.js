const { hotelProfileView } = require("../services/hotelPortalViews");
const Hotel = require("../models/Hotel");
const { isObjectId } = require("../utils/seoSlug");
const publicFields = "-owner -application -authorizedRepresentative -compliance -paymentPolicy";
const { normalizeCancellationPolicy } = require("../services/cancellationPolicyService");
let ActivityLog;
try {
  ActivityLog = require("../models/ActivityLog");
} catch {
  ActivityLog = null;
}

const generateApplicationNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `DFA-${datePart}-${randomPart}`;
};

const writeActivity = async (req, action, hotel, message, metadata = {}) => {
  try {
    if (!ActivityLog) return;
    await ActivityLog.create({
      actor: req.user?.id || null,
      actorRole: req.user?.role || "system",
      action,
      entityType: "hotel",
      entityId: hotel?._id || null,
      message,
      metadata,
    });
  } catch {
    // Activity logs should never block the user flow.
  }
};

const normalizeApplication = (application = {}, existing = {}) => ({
  ...existing,
  ...application,
  cuisineTypes: Array.isArray(application.cuisineTypes) ? application.cuisineTypes : existing.cuisineTypes || [],
  mealServices: Array.isArray(application.mealServices) ? application.mealServices : existing.mealServices || [],
  documents: Array.isArray(application.documents) ? application.documents : existing.documents || [],
  buffetCapacity: Number(application.buffetCapacity || existing.buffetCapacity || 0),
  averageBuffetPrice: Number(application.averageBuffetPrice || existing.averageBuffetPrice || 0),
  termsAccepted: Boolean(application.termsAccepted ?? existing.termsAccepted),
});

const buildHotelPayload = (reqBody, existingHotel = null) => {
  const application = normalizeApplication(reqBody.application || {}, existingHotel?.application || {});

  if (!application.applicationNumber) {
    application.applicationNumber = generateApplicationNumber();
  }

  const requestedModes = Array.isArray(reqBody.paymentPolicy?.acceptedModes)
    ? reqBody.paymentPolicy.acceptedModes.filter((mode) => ["pay_at_hotel", "deposit", "full_payment"].includes(mode))
    : existingHotel?.paymentPolicy?.acceptedModes || ["pay_at_hotel"];
  const paymentPolicy = {
    acceptedModes: requestedModes.length ? requestedModes : ["pay_at_hotel"],
    depositRate: Math.min(100, Math.max(1, Number(reqBody.paymentPolicy?.depositRate ?? existingHotel?.paymentPolicy?.depositRate ?? 20))),
    paymentExpiryMinutes: Math.min(60, Math.max(5, Number(reqBody.paymentPolicy?.paymentExpiryMinutes ?? existingHotel?.paymentPolicy?.paymentExpiryMinutes ?? 15))),
    settlementFrequency: ["weekly", "fortnightly", "monthly"].includes(reqBody.paymentPolicy?.settlementFrequency)
      ? reqBody.paymentPolicy.settlementFrequency
      : existingHotel?.paymentPolicy?.settlementFrequency || "weekly",
    updatedAt: reqBody.paymentPolicy ? new Date() : existingHotel?.paymentPolicy?.updatedAt || null,
  };
  const cancellationPolicy = {
    ...normalizeCancellationPolicy(reqBody.cancellationPolicy || existingHotel?.cancellationPolicy || {}),
    updatedAt: reqBody.cancellationPolicy ? new Date() : existingHotel?.cancellationPolicy?.updatedAt || null,
  };

  return {
    hotelName: reqBody.hotelName ?? existingHotel?.hotelName,
    location: reqBody.location ?? existingHotel?.location,
    address: reqBody.address ?? existingHotel?.address ?? "",
    city: reqBody.city ?? existingHotel?.city ?? "",
    district: reqBody.district ?? existingHotel?.district ?? "",
    province: reqBody.province ?? existingHotel?.province ?? "",
    country: reqBody.country ?? existingHotel?.country ?? "Sri Lanka",
    description: reqBody.description ?? existingHotel?.description ?? "",
    contactNumber: reqBody.contactNumber ?? existingHotel?.contactNumber ?? "",
    email: reqBody.email ?? existingHotel?.email ?? "",
    images: reqBody.images ?? existingHotel?.images ?? [],
    galleryImages: reqBody.galleryImages ?? existingHotel?.galleryImages ?? [],
    videos: reqBody.videos ?? existingHotel?.videos ?? [],
    amenities: reqBody.amenities ?? existingHotel?.amenities ?? [],
    diningHighlights: reqBody.diningHighlights ?? existingHotel?.diningHighlights ?? [],
    logo: reqBody.logo ?? existingHotel?.logo ?? "",
    coverMediaUrl: reqBody.coverMediaUrl ?? existingHotel?.coverMediaUrl ?? "",
    coverMediaType: reqBody.coverMediaType ?? existingHotel?.coverMediaType ?? "image",
    mapLocation: {
      googleMapUrl: reqBody.mapLocation?.googleMapUrl || existingHotel?.mapLocation?.googleMapUrl || "",
      latitude:
        reqBody.mapLocation?.latitude === "" || reqBody.mapLocation?.latitude === undefined
          ? existingHotel?.mapLocation?.latitude ?? null
          : Number(reqBody.mapLocation.latitude),
      longitude:
        reqBody.mapLocation?.longitude === "" || reqBody.mapLocation?.longitude === undefined
          ? existingHotel?.mapLocation?.longitude ?? null
          : Number(reqBody.mapLocation.longitude),
    },
    application,
    paymentPolicy,
    cancellationPolicy,
  };
};

exports.getHotels = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (q) {
      filter.$or = [
        { hotelName: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { district: { $regex: q, $options: "i" } },
        { province: { $regex: q, $options: "i" } },
        { "application.applicationNumber": { $regex: q, $options: "i" } },
      ];
    }

    const hotels = await Hotel.find(filter).select("+onboardingApplication").populate("owner", "name email role").sort({ createdAt: -1 });
    res.status(200).json(hotels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotels.", error: error.message });
  }
};

exports.getApprovedHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find({ isApproved: true, status: "approved" }).select(publicFields).sort({ featured: -1, createdAt: -1 });
    res.status(200).json(hotels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch approved hotels.", error: error.message });
  }
};

exports.getMapHotels = async (req, res) => {
  try {
    const { city, q } = req.query;
    const filter = {
      isApproved: true,
      status: "approved",
      "mapLocation.latitude": { $ne: null },
      "mapLocation.longitude": { $ne: null },
    };

    if (city) filter.city = { $regex: city, $options: "i" };
    if (q) {
      filter.$or = [
        { hotelName: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { district: { $regex: q, $options: "i" } },
        { province: { $regex: q, $options: "i" } },
      ];
    }

    const hotels = await Hotel.find(filter).select(publicFields).sort({ featured: -1, averageRating: -1, createdAt: -1 });
    res.status(200).json(hotels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch map hotels.", error: error.message });
  }
};

exports.getMyHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id }).select("+onboardingApplication").populate("owner", "name email role");
    if (!hotel) {
      return res.status(200).json({ hotel: null, hasHotel: false, message: "No hotel application has been submitted yet." });
    }
    const { onboardingApplication } = hotel;
    const profile = hotelProfileView(hotel);
    return res.status(200).json({ hotel: { ...profile, invitedOnboarding: Boolean(onboardingApplication) }, hasHotel: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch hotel profile.", error: error.message });
  }
};

exports.updateMyHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.user.id }).select("+onboardingApplication");
    if (!hotel) return res.status(404).json({ message: "Hotel profile not found." });

    const payload = buildHotelPayload(req.body, hotel);
    for (const key of ["accountNumber", "accountHolderName", "bankName", "bankBranch"]) {
      payload.application[key] = hotel.application?.[key] || "";
    }

    if (["rejected", "need_more_info"].includes(hotel.status)) {
      payload.status = "pending";
      payload.isApproved = false;
      payload.application.submittedAt = new Date();
      payload.application.reviewNote = "Resubmitted by hotel partner for admin review.";
      payload.application.history = [
        ...(hotel.application?.history || []),
        { status: "pending", note: "Application resubmitted by hotel partner.", by: req.user.id, at: new Date() },
      ];
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(hotel._id, payload, { new: true, runValidators: true });
    await writeActivity(req, "hotel_application_updated", updatedHotel, `${updatedHotel.hotelName} updated their hotel application.`);

    res.status(200).json({ message: "Hotel application/profile updated successfully.", hotel: { ...hotelProfileView(updatedHotel), invitedOnboarding: Boolean(hotel.onboardingApplication) } });
  } catch (error) {
    res.status(500).json({ message: "Failed to update hotel profile.", error: error.message });
  }
};

const moderateHotel = async (req, res, status, defaultNote) => {
  try {
    const { reviewNote } = req.body || {};
    const isApproved = status === "approved";
    const note = reviewNote || defaultNote;

    const hotel = await Hotel.findById(req.params.id).select("+onboardingApplication");
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });

    if (hotel.onboardingApplication && ["approved", "need_more_info", "pending"].includes(status)) {
      return res.status(409).json({ message: "Use the hotel onboarding and partnership review to make this decision." });
    }
    hotel.status = status;
    hotel.isApproved = isApproved;
    const partnershipMap = {
      approved: "active_legacy",
      rejected: "rejected",
      suspended: "suspended",
      need_more_info: "additional_information_required",
      hold: "under_review",
      pending: "under_review",
    };
    hotel.partnershipStatus = partnershipMap[status] || hotel.partnershipStatus;
    hotel.application.reviewedAt = new Date();
    hotel.application.reviewNote = note;
    hotel.application.history = [
      ...(hotel.application.history || []),
      { status, note, by: req.user.id, at: new Date() },
    ];

    await hotel.save();
    await writeActivity(req, `hotel_${status}`, hotel, `${hotel.hotelName} status changed to ${status}.`, { note });

    const label = status.replace(/_/g, " ");
    res.status(200).json({ message: `Hotel marked as ${label}.`, hotel });
  } catch (error) {
    res.status(500).json({ message: "Failed to update hotel moderation status.", error: error.message });
  }
};

exports.approveHotel = (req, res) => moderateHotel(req, res, "approved", "Approved by admin.");
exports.rejectHotel = (req, res) => moderateHotel(req, res, "rejected", "Rejected by admin. Please review application details.");
exports.suspendHotel = (req, res) => moderateHotel(req, res, "suspended", "Suspended by admin.");
exports.holdHotel = (req, res) => moderateHotel(req, res, "hold", "Placed on hold by admin.");
exports.requestMoreInfoHotel = (req, res) => moderateHotel(req, res, "need_more_info", "Admin requested more information.");
exports.reopenHotel = (req, res) => moderateHotel(req, res, "pending", "Application reopened for review.");

exports.getHotelById = async (req, res) => {
  try {
    const identifier = req.params.id;
    const filter = isObjectId(identifier) ? { _id: identifier } : { slug: identifier.toLowerCase() };
    const hotel = await Hotel.findOne({ ...filter, status: "approved" }).select(publicFields);
    if (!hotel) return res.status(404).json({ message: "Hotel not found." });

    if (hotel.status !== "approved") {
      return res.status(404).json({ message: "Hotel not found." });
    }

    res.status(200).json(hotel);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hotel profile.", error: error.message });
  }
};
