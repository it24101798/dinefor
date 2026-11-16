const finalStatusByDirection = {
  payable_to_hotel: "paid",
  receivable_from_hotel: "received",
  balanced: "reconciled",
};
const completionStatuses = new Set(Object.values(finalStatusByDirection));

function settlementActions({ status, direction }) {
  const final = finalStatusByDirection[direction];
  switch (status) {
    case "draft": return ["approved", "cancelled"];
    case "disputed": return ["approved", "cancelled"];
    case "approved": return direction === "balanced"
      ? ["reconciled", "disputed", "cancelled"]
      : ["processing", "disputed", "cancelled"];
    case "processing": return final ? [final, "disputed"] : ["disputed"];
    default: return [];
  }
}

module.exports = { settlementActions, completionStatuses };
