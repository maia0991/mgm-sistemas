import Sidebar from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Admin indicator bar */}
      {isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
      )}
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">{children}</main>
    </div>
  );
}
