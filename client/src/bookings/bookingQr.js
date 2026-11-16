import QRCode from "./vendor/qrcode-browser.js";

export function makeBookingQr(code) {
  const url = new URL(`/check-in/${encodeURIComponent(code)}`, window.location.origin);
  return QRCode.toDataURL(url.href, { width: 256, margin: 3, errorCorrectionLevel: "M" });
}
