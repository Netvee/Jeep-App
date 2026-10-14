import { requireAdmin } from "@/server/auth";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      {children}
    </div>
  );
}
