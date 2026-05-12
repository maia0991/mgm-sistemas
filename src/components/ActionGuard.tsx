import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface ActionGuardProps {
  children: ReactNode;
  fallbackLabel?: string;
  className?: string;
  allowAdmin?: boolean;
}

export default function ActionGuard({
  children,
  fallbackLabel = "Ação bloqueada",
  className = "",
  allowAdmin = true,
}: ActionGuardProps) {
  const { role, statusFinanceiro } = useAuth();

  const blockedByBilling =
    (!allowAdmin || role !== "admin") &&
    (statusFinanceiro === "expired" || statusFinanceiro === "blocked");

  if (!blockedByBilling) {
    return <>{children}</>;
  }

  return (
    <Button type="button" disabled className={className}>
      <Lock className="mr-2 h-4 w-4" />
      {fallbackLabel}
    </Button>
  );
}