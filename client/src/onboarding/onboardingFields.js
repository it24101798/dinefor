export const steps = [
  { name: "Business", fields: [["legalName", "Registered business name"], ["tradingName", "Hotel trading name"], ["registrationNumber", "Business registration number"], ["category", "Property type"]] },
  { name: "Location", fields: [["province", "Province"], ["district", "District"], ["city", "City or town"], ["address", "Street address"]] },
  { name: "Contact", fields: [["contactName", "Hotel contact name"], ["contactPhone", "Hotel contact phone", "tel"], ["representativeName", "Authorised representative"], ["representativeTitle", "Representative’s position"], ["representativeEmail", "Representative’s work email", "email"]] },
  { name: "Dining", fields: [["diningCapacity", "Number of diners you can seat", "number"], ["roomCount", "Rooms (optional)", "number"], ["buffetCategories", "Buffet categories"]] },
  { name: "Settlement", fields: [["bankHolder", "Account holder"], ["bankName", "Bank"], ["bankBranch", "Branch"]] },
  { name: "Review", fields: [] },
];

export const evidenceFields = [
  ["registration", "Business registration evidence"],
  ["authority", "Proof of authority to represent the business"],
  ["bank", "Bank account proof"],
  ["photo", "Property or dining photo"],
];

export const acceptanceFields = [
  ["privacyAccepted", "Privacy notice"],
  ["photoPermission", "Photo permission"],
  ["termsAccepted", "Application declaration"],
  ["marketingOptIn", "Marketing preference"],
];

export const reviewFields = [
  ...steps.flatMap(step => step.fields), ...evidenceFields, ...acceptanceFields,
  ["bankNumber", "Settlement account number"], ["pin", "Map pin"],
];

export const districts = {
  Central: ["Kandy", "Matale", "Nuwara Eliya"], Eastern: ["Ampara", "Batticaloa", "Trincomalee"],
  Northern: ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"], "North Central": ["Anuradhapura", "Polonnaruwa"],
  "North Western": ["Kurunegala", "Puttalam"], Sabaragamuwa: ["Kegalle", "Ratnapura"],
  Southern: ["Galle", "Hambantota", "Matara"], Uva: ["Badulla", "Monaragala"], Western: ["Colombo", "Gampaha", "Kalutara"],
};

export const towns = {
  Colombo: ["Malabe", "Kotte", "Dehiwala", "Mount Lavinia", "Homagama", "Moratuwa"],
  Gampaha: ["Negombo", "Wattala", "Kelaniya", "Ja-Ela"], Kalutara: ["Panadura", "Aluthgama", "Beruwala"],
  Galle: ["Hikkaduwa", "Unawatuna", "Ambalangoda", "Rathgama", "Balapitiya", "Bentota"], Matara: ["Weligama", "Mirissa", "Dikwella"],
  Hambantota: ["Tangalle", "Tissamaharama"], Kandy: ["Peradeniya", "Gampola"], Matale: ["Dambulla", "Sigiriya"],
};

export const statusLabel = value => ({
  lead: "Enquiry", draft: "Draft", submitted: "Submitted", under_review: "Under review", changes_requested: "Changes requested",
  resubmitted: "Resubmitted", approved: "Application approved", rejected: "Rejected",
})[value] || value;
