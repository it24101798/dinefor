const generateInvoiceNumber = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DF-INV-${y}${m}${d}-${Date.now().toString().slice(-6)}-${random}`;
};

module.exports = { generateInvoiceNumber };
