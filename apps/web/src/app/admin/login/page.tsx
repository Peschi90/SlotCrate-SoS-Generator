import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user && user.role === "ADMIN") redirect("/admin");
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <LoginForm />
    </div>
  );
}
