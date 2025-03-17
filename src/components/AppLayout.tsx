
import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const { user, loading } = useAuth();

  // Se ainda estiver carregando, mostrar um indicador de carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b87f5]"></div>
      </div>
    );
  }

  // Se o usuário não estiver autenticado após o carregamento, redirecionar para a página de login
  if (!user) {
    return <Navigate to="/auth" />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto pt-24 md:pt-20 w-full">
          <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 z-40" />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
