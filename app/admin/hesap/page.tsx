import { requireSuperadmin } from "@/lib/auth/dal";
import { PasswordForm } from "@/components/panel/PasswordForm";

export const metadata = { title: "Hesabım" };

export default async function AdminAccountPage() {
  const user = await requireSuperadmin();
  return (
    <>
      <h1 className="text-3xl font-bold sm:text-4xl">Hesabım</h1>
      <p className="mt-1.5 text-stone">{user.email}</p>
      <h2 className="mt-10 mb-4 text-xl font-semibold">Şifre değiştir</h2>
      <PasswordForm />
    </>
  );
}
