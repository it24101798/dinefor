function readGuestDetails(details, requests) {
  if (!details || typeof details !== "object" || Array.isArray(details)) throw new Error("Enter guest details.");
  function field(source, key, max) {
    const value = source?.[key] ?? "";
    if (typeof value !== "string" || value.length > max) throw new Error("Check the length of your guest details and requests.");
    return value.trim();
  }
  const name = field(details, "name", 100);
  const email = field(details, "email", 254).toLowerCase();
  const phone = field(details, "phone", 25);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[\d ()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
    throw new Error("Enter a name, valid email and phone number.");
  }
  const dietaryNotes = field(requests, "dietaryNotes", 500);
  if (dietaryNotes && requests?.shareDietary !== true) throw new Error("Allow the hotel to read the dietary note or remove it.");
  return {
    guestDetails: { name, email, phone, bookingForSomeoneElse: details.bookingForSomeoneElse === true },
    specialRequests: { dietaryNotes, additionalNotes: field(requests, "additionalNotes", 500), shareDietary: Boolean(dietaryNotes && requests.shareDietary) },
  };
}

module.exports = { readGuestDetails };
