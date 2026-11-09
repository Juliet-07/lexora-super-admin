import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Lets anyone signed in to the console set their own password — new admin
// users start on an emailed temporary one and need somewhere to replace it.
export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current && next.length >= 8 && next === confirm;

  const mutation = useMutation({
    mutationFn: () =>
      api.patch("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Could not change password"),
  });

  return (
    <form
      className="bg-card border rounded-xl p-6 shadow-sm space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) mutation.mutate();
      }}
    >
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          Change password
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-current">Current password</Label>
          <Input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-new">New password</Label>
          <Input
            id="cp-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-confirm">Confirm new password</Label>
          <Input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && (
            <p className="text-xs text-destructive">Passwords don't match.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Update password"
          )}
        </Button>
      </div>
    </form>
  );
}
