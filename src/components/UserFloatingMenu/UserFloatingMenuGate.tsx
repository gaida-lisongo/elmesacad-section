"use client";

import { getFloatingMenuForUser } from "@/config/userFloatingMenu";
import { useRouter } from "next/navigation";
import UserFloatingMenu from "./index";
import { useAuthStore } from "@/stores/authStore";

export function UserFloatingMenuGate() {
  const user = useAuthStore((s) => s.user);
  console.log("Current User:", user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  if (!isHydrated || !user) {
    return null;
  }

  return (
    <UserFloatingMenu
      config={{
        account: user.accountLabel,
        menu: getFloatingMenuForUser(user),
      }}
      onLogout={async () => {
        await logout();
        router.push("/");
        router.refresh();
      }}
    />
  );
}
