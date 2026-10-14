"use client";

import { logoutAction } from "@/app/actions/auth";
import { clearPack } from "@/lib/offline-pack";

/** Logs out and clears the device's offline pack so the next user of this device cannot see it. */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction} onSubmit={() => clearPack()} className={className}>
      <button className="text-sm text-sand-300 hover:text-white rounded-lg px-2 min-h-10">יציאה</button>
    </form>
  );
}
