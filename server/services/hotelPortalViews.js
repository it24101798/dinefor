const plain = (value) => value?.toObject?.() || value;

function hotelProfileView(hotel) {
  const profile = plain(hotel);
  if (!profile) return profile;
  const { onboardingApplication, application, ...details } = profile;
  if (!application) return details;
  const { accountNumber, ...applicationDetails } = application;
  const last4 = String(accountNumber || "").replace(/\D/g, "").slice(-4);
  return { ...details, application: { ...applicationDetails, accountNumber: last4 ? `•••• ${last4}` : "" } };
}

function hotelBookingView(booking) {
  if (!booking) return booking;
  const { _id, bookingCode, bookingStatus, createdAt, selectedDate, selectedTimeSlot, seats,
    grandTotal, totalAmount, qrUsed, paymentStatus, checkedInAt, completedAt,
    guestDetails, user, buffet, specialRequests, statusTimeline } = plain(booking);
  const { occasion, seating, highChair, wheelchairAccess, additionalNotes, shareDietary, dietaryNotes } = specialRequests || {};
  return {
    _id, bookingCode, bookingStatus, createdAt, selectedDate, seats, grandTotal,
    totalAmount, qrUsed, paymentStatus, checkedInAt, completedAt,
    selectedTimeSlot: { startTime: selectedTimeSlot?.startTime, endTime: selectedTimeSlot?.endTime },
    user: { _id: user?._id, name: guestDetails?.name || user?.name },
    buffet: buffet ? { _id: buffet._id, title: buffet.title, hotel: { hotelName: buffet.hotel?.hotelName } } : null,
    specialRequests: {
      occasion, seating, highChair, wheelchairAccess, additionalNotes,
      shareDietary: shareDietary === true,
      dietaryNotes: shareDietary === true ? dietaryNotes : undefined,
    },
    statusTimeline: (statusTimeline || []).map(({ status, at }) => ({ status, at })),
  };
}

function hotelPaymentView(payment) {
  if (!payment) return payment;
  const { booking, user, hotel, metadata, ...details } = plain(payment);
  return {
    ...details,
    booking: hotelBookingView(booking),
    user: { name: booking?.guestDetails?.name || user?.name },
    hotel: hotel?.hotelName ? { _id: hotel._id, hotelName: hotel.hotelName, location: hotel.location } : hotel,
    metadata: { buffetTitle: metadata?.buffetTitle },
  };
}

function hotelCancellationView(cancellation) {
  if (!cancellation) return cancellation;
  const { booking, customer, requestedBy, resolvedBy, ...details } = plain(cancellation);
  return {
    ...details,
    booking: hotelBookingView(booking),
    customer: { name: booking?.guestDetails?.name || customer?.name },
  };
}

function hotelTransactionView(transaction) {
  const { _id, type, direction, amount, currency, gateway, status, createdAt, verified } = plain(transaction);
  return { _id, type, direction, amount, currency, gateway, status, createdAt, verified };
}

module.exports = { hotelProfileView, hotelBookingView, hotelPaymentView, hotelCancellationView, hotelTransactionView };
