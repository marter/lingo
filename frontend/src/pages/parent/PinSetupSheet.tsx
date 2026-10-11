import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { extractErrorMessage } from "../../api/client";
import { setPin } from "../../api/parent";
import { PinPad } from "../../components/PinPad";
import { Sheet } from "../../components/Sheet";

/** Choose (or change) the PIN: enter it twice. */
export function PinSetupSheet({ changing, onClose }: { changing: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [first, setFirst] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);

  return (
    <Sheet title={changing ? "Change PIN" : "Choose a PIN"} onClose={onClose}>
      {first === null ? (
        <PinPad
          key="first"
          prompt={
            mismatch ? "Those didn't match. Pick your PIN again" : "Pick 4 digits your kids won't guess"
          }
          onComplete={async (pin) => {
            setMismatch(false);
            setFirst(pin);
            return null;
          }}
        />
      ) : (
        <PinPad
          key="confirm"
          prompt="Enter it again to confirm"
          onComplete={async (pin) => {
            if (pin !== first) {
              setMismatch(true);
              setFirst(null);
              return null;
            }
            try {
              await setPin(pin);
              await queryClient.invalidateQueries({ queryKey: ["parent", "me"] });
              await queryClient.invalidateQueries({ queryKey: ["family"] });
              onClose();
              return null;
            } catch (err) {
              return extractErrorMessage(err, "Couldn't save the PIN. Try again.");
            }
          }}
        />
      )}
    </Sheet>
  );
}
