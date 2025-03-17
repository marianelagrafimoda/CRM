
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Vendas from "./pages/Vendas";
import Estoque from "./pages/Estoque";
import Fornecedores from "./pages/Fornecedores";
import Financas from "./pages/Financas";
import ContasPagar from "./pages/ContasPagar";
import Tarefas from "./pages/Tarefas";
import Aniversariantes from "./pages/Aniversariantes";
import Emails from "./pages/Emails";
import Relatorios from "./pages/Relatorios";
import NovosProjetos from "./pages/NovosProjetos";
import Notificacoes from "./pages/Notificacoes";
import Configuracoes from "./pages/Configuracoes";
import MinhaConta from "./pages/MinhaConta";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/AuthGuard";
import { AuthProvider } from "./contexts/AuthContext";
import { AppThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import "./App.css";

function Fallback({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold text-destructive">Something went wrong!</h1>
      <p className="mt-4 text-lg">{error.message}</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary FallbackComponent={Fallback}>
          <AppThemeProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AppThemeProvider>
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    errorElement: <NotFound />,
    children: [
      {
        path: "/",
        element: <Dashboard />
      },
      {
        path: "/clientes",
        element: <Clientes />
      },
      {
        path: "/pedidos",
        element: <Pedidos />
      },
      {
        path: "/vendas",
        element: <Vendas />
      },
      {
        path: "/estoque",
        element: <Estoque />
      },
      {
        path: "/fornecedores",
        element: <Fornecedores />
      },
      {
        path: "/financas",
        element: <Financas />
      },
      {
        path: "/contas-pagar",
        element: <ContasPagar />
      },
      {
        path: "/tarefas",
        element: <Tarefas />
      },
      {
        path: "/aniversariantes",
        element: <Aniversariantes />
      },
      {
        path: "/emails",
        element: <Emails />
      },
      {
        path: "/relatorios",
        element: <Relatorios />
      },
      {
        path: "/novos-projetos",
        element: <NovosProjetos />
      },
      {
        path: "/notificacoes",
        element: <Notificacoes />
      },
      {
        path: "/configuracoes",
        element: <Configuracoes />
      },
      {
        path: "/minha-conta",
        element: <MinhaConta />
      }
    ]
  },
  {
    path: "/auth",
    element: <Auth />
  }
]);

export default App;
