import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  return <AdminClient />;
}
