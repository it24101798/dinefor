const methods = [
  { id: "pay_at_hotel", title: "Pay at Hotel", note: "Confirm now and pay directly at the hotel entrance.", enabled: true },
  { id: "payhere", title: "PayHere", note: "Sri Lanka online gateway integration prepared.", enabled: false },
  { id: "stripe", title: "Credit/Debit Card", note: "Stripe integration prepared for international payments.", enabled: false },
  { id: "wallet", title: "DineFor Wallet", note: "Wallet and loyalty credits will be enabled later.", enabled: false },
];

function PaymentMethodSelector({ value, onChange }) {
  return (
    <div className="payment-method-grid">
      {methods.map((method) => (
        <button
          type="button"
          key={method.id}
          className={value === method.id ? "payment-method-card active" : "payment-method-card"}
          disabled={!method.enabled}
          onClick={() => method.enabled && onChange(method.id)}
        >
          <span className="payment-radio">{value === method.id ? "●" : "○"}</span>
          <div>
            <strong>{method.title}</strong>
            <p>{method.note}</p>
            {!method.enabled && <small>Coming soon</small>}
          </div>
        </button>
      ))}
    </div>
  );
}

export default PaymentMethodSelector;
