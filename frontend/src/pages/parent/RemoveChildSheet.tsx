import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractErrorMessage } from "../../api/client";
import { deleteChild } from "../../api/parent";
import { Sheet } from "../../components/Sheet";
import type { Child } from "../../types";

/** Deleting is permanent, so the parent types the nickname to confirm. */
export function RemoveChildSheet({ child, onClose }: { child: Child; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const remove = useMutation({
    mutationFn: () => deleteChild(child.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parent", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      onClose();
    },
  });
  const matches = typed.trim().toLowerCase() === child.nickname.toLowerCase();

  return (
    <Sheet title={`Remove ${child.nickname}?`} onClose={onClose}>
      <div className="form">
        <p>
          This permanently deletes {child.avatar} <strong>{child.nickname}</strong>'s profile and
          everything they've learned. It can't be undone.
        </p>
        <label>
          <span>
            Type <strong>{child.nickname}</strong> to confirm
          </span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
        {remove.isError && (
          <p className="form-error" role="alert">
            {extractErrorMessage(remove.error, "Couldn't remove. Try again.")}
          </p>
        )}
        <button
          type="button"
          className="btn btn-danger"
          disabled={!matches || remove.isPending}
          onClick={() => remove.mutate()}
        >
          {remove.isPending ? "Removing…" : "Remove forever"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Keep {child.nickname}
        </button>
      </div>
    </Sheet>
  );
}
