import React from "react";

function PaymentMethodSelector({ value, onChange, disabled = false, payHereEnabled = false, depositRate = 20, acceptedModes = ["pay_at_hotel"] }) {
  const methods = [
    {
      id: "pay_at_hotel",
      label: "Pay at Hotel",
      icon: "payments",
      description: "Pay when you arrive at the hotel",
      recommended: !payHereEnabled,
    },
    {
      id: "deposit",
      label: `Pay ${depositRate}% Deposit`,
      icon: "credit_card",
      description: payHereEnabled ? "Secure the seats now; pay the balance at the hotel" : "Available after PayHere merchant setup",
      disabled: !payHereEnabled,
      recommended: payHereEnabled,
    },
    {
      id: "full_payment",
      label: "Pay in Full Online",
      icon: "verified_user",
      description: payHereEnabled ? "Pay the full customer total securely with PayHere" : "Available after PayHere merchant setup",
      disabled: !payHereEnabled,
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const unavailable = method.disabled || !acceptedModes.includes(method.id);
        return (
          <label
            key={method.id}
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              value === method.id && !unavailable
                ? "border-secondary bg-secondary-container/10 ring-1 ring-secondary"
                : unavailable
                ? "border-border-subtle opacity-50 cursor-not-allowed"
                : "border-border-subtle hover:border-secondary/50 hover:bg-surface-container-low"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={value === method.id}
              onChange={() => !unavailable && !disabled && onChange(method.id)}
              disabled={unavailable || disabled}
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
              {method.recommended && !unavailable && (
                <span className="badge-gold text-xs mt-1">Recommended</span>
              )}
            </div>
            {value === method.id && !unavailable && (
              <span className="text-secondary">
                <span className="material-symbols-outlined">check_circle</span>
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export default PaymentMethodSelector;
