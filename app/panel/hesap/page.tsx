import { requireClinicUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/panel/PageHeader";
import { PasswordForm } from "@/components/panel/PasswordForm";
import { USER_ROLE_LABELS } from "@/lib/constants";

export const metadata = { title: "Hesabım" };

export default async function AccountPage() {
  const { user } = await requireClinicUser();
  return (
    <>
      <PageHeader title="Hesabım" />
      <dl className="mb-10 grid max-w-xl grid-cols-1 gap-4 rounded-panel border border-line bg-surface p-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-stone">Ad soyad</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone">Yetki</dt>
          <dd className="font-medium">{USER_ROLE_LABELS[user.role]}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-stone">E-posta</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
      </dl>
      <h2 className="mb-4 text-xl font-semibold">Şifre değiştir</h2>
      <PasswordForm />
    </>
  );
}
