import { requireClinicUser } from "@/lib/auth/dal";
import { getClinicUsers } from "@/lib/data/panel";
import { PageHeader } from "@/components/panel/PageHeader";
import { UserManager } from "@/components/panel/UserManager";

export const metadata = { title: "Kullanıcılar" };

const fmt = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function UsersPage() {
  const { clinic, user } = await requireClinicUser({ adminOnly: true });
  const list = await getClinicUsers(clinic.id);
  return (
    <>
      <PageHeader
        title="Kullanıcılar"
        description="Panele giriş yapabilen ekip arkadaşların. Personel, ayarları ve kullanıcıları göremez."
      />
      <UserManager
        currentUserId={user.id}
        users={list
          .filter((u) => u.role !== "superadmin")
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            lastLogin: u.lastLoginAt ? fmt.format(u.lastLoginAt) : null,
          }))}
      />
    </>
  );
}
