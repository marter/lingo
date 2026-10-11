import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { extractErrorMessage } from "../../api/client";
import { addChild, fetchOptions, updateChild } from "../../api/parent";
import type { ChildInput } from "../../api/parent";
import { Sheet } from "../../components/Sheet";
import type { AgeBand, Child } from "../../types";

/** Add a kid, or edit one. Just a nickname, an avatar and an age band, nothing else. */
export function ChildFormSheet({
  child,
  onClose,
  onRemove,
}: {
  child?: Child;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const queryClient = useQueryClient();
  const options = useQuery({ queryKey: ["parent", "options"], queryFn: fetchOptions });
  const [nickname, setNickname] = useState(child?.nickname ?? "");
  const [avatar, setAvatar] = useState(child?.avatar ?? "");
  const [ageBand, setAgeBand] = useState<AgeBand | "">(child?.age_band ?? "");

  const save = useMutation({
    mutationFn: (input: ChildInput) => (child ? updateChild(child.id, input) : addChild(input)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parent", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      onClose();
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!avatar || !ageBand) return;
    save.mutate({ nickname, avatar, age_band: ageBand });
  }

  const missing = !nickname.trim()
    ? "Add a nickname"
    : !avatar
      ? "Pick an avatar"
      : !ageBand
        ? "Pick an age"
        : null;

  return (
    <Sheet title={child ? `Edit ${child.nickname}` : "Add a kid"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Nickname
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            autoComplete="off"
            required
          />
          <span className="hint">A first name or a fun name. No last names, please.</span>
        </label>

        <fieldset>
          <legend>Avatar</legend>
          <div className="avatar-grid">
            {options.data?.avatars.map((a) => (
              <button
                key={a}
                type="button"
                className={`avatar-choice${a === avatar ? " selected" : ""}`}
                onClick={() => setAvatar(a)}
                aria-pressed={a === avatar}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Age</legend>
          <div className="segmented">
            {options.data?.age_bands.map((band) => (
              <button
                key={band}
                type="button"
                className={band === ageBand ? "selected" : ""}
                onClick={() => setAgeBand(band)}
                aria-pressed={band === ageBand}
              >
                {band}
              </button>
            ))}
          </div>
        </fieldset>

        {save.isError && (
          <p className="form-error" role="alert">
            {extractErrorMessage(save.error, "Couldn't save. Try again.")}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={missing !== null || save.isPending}>
          {save.isPending ? "Saving…" : (missing ?? (child ? "Save" : "Add"))}
        </button>
        {onRemove && (
          <button type="button" className="btn btn-danger-ghost" onClick={onRemove}>
            Remove {child?.nickname}…
          </button>
        )}
      </form>
    </Sheet>
  );
}
