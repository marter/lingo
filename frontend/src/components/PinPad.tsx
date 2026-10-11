import { useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/**
 * A 4-digit keypad. Calls `onComplete` once 4 digits are in; if it returns an error
 * message, the dots shake and clear so the parent can try again.
 */
export function PinPad({
  prompt,
  onComplete,
}: {
  prompt: string;
  onComplete: (pin: string) => Promise<string | null>;
}) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function press(key: string) {
    if (busy) return;
    if (key === "⌫") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    const next = (digits + key).slice(0, 4);
    setDigits(next);
    setError(null);
    if (next.length < 4) return;
    setBusy(true);
    const message = await onComplete(next);
    setBusy(false);
    setDigits("");
    if (message) setError(message);
  }

  return (
    <div className="pinpad">
      <p className="pinpad-prompt">{prompt}</p>
      <div className={`pin-dots${error ? " shake" : ""}`} aria-label={`${digits.length} of 4 digits`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < digits.length ? "filled" : ""} />
        ))}
      </div>
      <p className="form-error pinpad-error" role="alert">
        {error}
      </p>
      <div className="pinpad-keys">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className="pin-key"
              onClick={() => press(key)}
              disabled={busy}
              aria-label={key === "⌫" ? "Delete" : key}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
