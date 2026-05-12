import { useAuth } from "@/contexts/AuthContext";

export function useBillingAccess() {
  const { role, statusFinanceiro, diasParaVencimento } = useAuth();

  const blockedByBilling =
    role !== "admin" &&
    (statusFinanceiro === "expired" || statusFinanceiro === "blocked");

  const warningByBilling =
    role !== "admin" && statusFinanceiro === "warning";

  const canCreate = !blockedByBilling;
  const canEdit = !blockedByBilling;
  const canDelete = !blockedByBilling;
  const canWrite = !blockedByBilling;

  return {
    blockedByBilling,
    warningByBilling,
    statusFinanceiro,
    diasParaVencimento,
    canCreate,
    canEdit,
    canDelete,
    canWrite,
  };
}