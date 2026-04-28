import type { DashboardAdminCapabilities } from "@/lib/dashboard/types";

export const DEFAULT_ADMIN_CAPABILITIES: DashboardAdminCapabilities = {
  canManageUserAccounts: false,
  canManageFilieres: false,
  canReadTransactions: false,
};
