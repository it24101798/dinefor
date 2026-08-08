import React, { useMemo, useState } from "react";

export const evaluatePassword = (password = "") => {
  const checks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label =
    score <= 1
      ? "Weak"
      : score <= 3
        ? "Fair"
        : score === 4
          ? "Good"
          : "Strong";
  return { checks, score, label, valid: score === 5 };
};

export default function PasswordField({
  label,
  value,
  onChange,
  name,
  autoComplete,
  showStrength = false,
  error = "",
  required = true,
  placeholder = "",
}) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(
    () => evaluatePassword(value),
    [value]
  );

  return (
    <label className="block">
      <span className="font-label-sm text-on-surface-variant">
        {label}
      </span>
      <div className="relative mt-1">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className={`form-input w-full pr-12 ${
            error ? "border-error" : ""
          }`}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-on-surface-variant"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <span className="material-symbols-outlined">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>

      {error && (
        <p className="text-error text-xs mt-1">{error}</p>
      )}

      {showStrength && value && (
        <div className="mt-2">
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <span
                key={item}
                className={`h-1.5 rounded-full ${
                  item <= strength.score
                    ? strength.score <= 2
                      ? "bg-error"
                      : strength.score <= 4
                        ? "bg-highlight-gold"
                        : "bg-secondary"
                    : "bg-surface-container-high"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs">
            <span className="text-on-surface-variant">
              Password strength
            </span>
            <strong>{strength.label}</strong>
          </div>
          <div className="grid sm:grid-cols-2 gap-1 mt-2 text-xs text-on-surface-variant">
            {[
              ["length", "8+ characters"],
              ["upper", "Uppercase letter"],
              ["lower", "Lowercase letter"],
              ["number", "Number"],
              ["special", "Special character"],
            ].map(([key, text]) => (
              <span key={key}>
                {strength.checks[key] ? "✓" : "○"} {text}
              </span>
            ))}
          </div>
        </div>
      )}
    </label>
  );
}
