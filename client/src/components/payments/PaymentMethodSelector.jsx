import React from "react";

function PaymentMethodSelector({ value, onChange, disabled = false }) {
  const methods = [
    {
      id: "pay_at_hotel",
      label: "Pay at Hotel",
      icon: "payments",
      description: "Pay when you arrive at the hotel",
      recommended: true,
    },
    {
      id: "online",
      label: "Online Payment",
      icon: "credit_card",
      description: "Pay securely online (Coming soon)",
      disabled: true,
    },
    {
      id: "wallet",
      label: "DineFor Wallet",
      icon: "wallet",
      description: "Use your DineFor wallet balance (Coming soon)",
      disabled: true,
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <label
          key={method.id}
          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            value === method.id && !method.disabled
              ? "border-secondary bg-secondary-container/10 ring-1 ring-secondary"
              : method.disabled
              ? "border-border-subtle opacity-50 cursor-not-allowed"
              : "border-border-subtle hover:border-secondary/50 hover:bg-surface-container-low"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={method.id}
            checked={value === method.id}
            onChange={() => !method.disabled && !disabled && onChange(method.id)}
            disabled={method.disabled || disabled}
            className="mt-1 w-4 h-4 text-secondary focus:ring-secondary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-secondary">{method.icon}</span>
              <div>
                <p className="font-label-md text-label-md text-text-deep-green">{method.label}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{method.description}</p>
              </div>
            </div>
            {method.recommended && !method.disabled && (
              <span className="badge-gold text-xs mt-1">Recommended</span>
            )}
          </div>
          {value === method.id && !method.disabled && (
            <span className="text-secondary">
              <span className="material-symbols-outlined">check_circle</span>
            </span>
          )}
        </label>
      ))}
    </div>
  );
}

export default PaymentMethodSelector;