
import {
  Users,
  ShoppingCart,
  Package,
  Truck,
  CheckSquare,
  Settings,
  Home,
  Menu,
  Gift,
  MessageSquare,
  PartyPopper,
  FileText,
  Lightbulb,
  User,
  Calendar,
  Mail,
  DollarSign,
  Receipt,
  WalletCards
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { format, parseISO, isValid, isSameDay, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  dataVencimento: string;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  aniversario: string;
  classificacao: number;
}

interface ContaPagar {
  id: string;
  descricao: string;
  data_vencimento: string;
  valor: number;
  status: string;
  importante: boolean;
}

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/" },
  { title: "Clientes", icon: Users, path: "/clientes" },
  { title: "Pedidos", icon: Package, path: "/pedidos" },
  { title: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { title: "Estoque", icon: Package, path: "/estoque" },
  { title: "Fornecedores", icon: Truck, path: "/fornecedores" },
  { title: "Finanças", icon: DollarSign, path: "/financas" },
  { title: "A Pagar", icon: WalletCards, path: "/contas-pagar" },
  { title: "Tarefas", icon: CheckSquare, path: "/tarefas" },
  { title: "Aniversariantes", icon: Gift, path: "/aniversariantes" },
  { title: "E-mails", icon: Mail, path: "/emails" },
  { title: "Relatórios", icon: FileText, path: "/relatorios" },
  { title: "Novos Projetos", icon: Lightbulb, path: "/novos-projetos" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
  { title: "Minha Conta", icon: User, path: "/minha-conta" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [tarefasPendentes, setTarefasPendentes] = useState<Tarefa[]>([]);
  const [aniversariantes, setAniversariantes] = useState<Cliente[]>([]);
  const [contasVencidas, setContasVencidas] = useState<ContaPagar[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTarefasPendentes();
      fetchAniversariantes();
      fetchContasVencidas();

      const taskChannel = supabase
        .channel('public:tasks')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks'
        }, fetchTarefasPendentes)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks'
        }, fetchTarefasPendentes)
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks'
        }, fetchTarefasPendentes)
        .subscribe();

      const contasChannel = supabase
        .channel('public:financas')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'financas'
        }, fetchContasVencidas)
        .subscribe();

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('clientDataChanged', fetchAniversariantes);

      return () => {
        supabase.removeChannel(taskChannel);
        supabase.removeChannel(contasChannel);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('clientDataChanged', fetchAniversariantes);
      };
    }
  }, [user]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user) {
        fetchAniversariantes();
        fetchContasVencidas();
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [user]);

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'clientes') {
      fetchAniversariantes();
    }
  };

  const fetchTarefasPendentes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      const tarefasFormatadas = data?.map(task => ({
        id: task.id,
        titulo: task.title,
        concluida: false,
        dataVencimento: task.due_date || new Date().toISOString().split('T')[0]
      })) || [];

      setTarefasPendentes(tarefasFormatadas);
    } catch (error) {
      console.error("Erro ao buscar tarefas pendentes:", error);
    }
  };

  const fetchAniversariantes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('owner_id', user.id);
        
      if (error) throw error;
      
      const hoje = new Date();
      
      const aniversariantesHoje = data
        .filter(cliente => {
          if (!cliente.birthday) return false;
          
          try {
            const aniversario = parseISO(cliente.birthday);
            if (!isValid(aniversario)) return false;
            
            return (
              aniversario.getDate() === hoje.getDate() && 
              aniversario.getMonth() === hoje.getMonth()
            );
          } catch (error) {
            console.error("Erro ao processar aniversário:", error);
            return false;
          }
        })
        .map(cliente => ({
          id: cliente.id,
          nome: cliente.name,
          telefone: cliente.phone || '',
          email: cliente.email || '',
          aniversario: cliente.birthday || '',
          classificacao: cliente.classification || 1
        }));
      
      setAniversariantes(aniversariantesHoje);
      
      // Removed the pop-up notification for birthdays
    } catch (error) {
      console.error("Erro ao buscar aniversariantes:", error);
      setAniversariantes([]);
    }
  };

  const fetchContasVencidas = async () => {
    if (!user) return;
    
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('financas')
        .select('*')
        .eq('owner_id', user.id)
        .eq('tipo', 'despesa')
        .or(`status.eq.pendente,status.eq.vencida`)
        .order('data_vencimento', { ascending: true });
      
      if (error) throw error;
      
      const contasFormatadas = data.map(conta => {
        const dataVencimento = parseISO(conta.data_vencimento);
        let status = conta.status;
        
        if (status === 'pendente' && isBefore(dataVencimento, hoje)) {
          status = 'vencida';
          try {
            (async () => {
              try {
                await supabase
                  .from('financas')
                  .update({ status: 'vencida' })
                  .eq('id', conta.id);
                console.log("Status atualizado para vencido");
              } catch (err) {
                console.error("Erro ao atualizar status:", err);
              }
            })();
          } catch (err) {
            console.error("Erro ao atualizar status:", err);
          }
        }
        
        return {
          id: conta.id,
          descricao: conta.descricao,
          data_vencimento: conta.data_vencimento,
          valor: conta.valor,
          status: status,
          importante: false
        };
      });
      
      const contasRelevantes = contasFormatadas.filter(conta => {
        const dataVencimento = parseISO(conta.data_vencimento);
        const limitePrazo = addDays(hoje, 7);
        return conta.status === 'vencida' || (conta.status === 'pendente' && isBefore(dataVencimento, limitePrazo));
      });
      
      setContasVencidas(contasRelevantes);
      
      // Removed the pop-up notification for overdue accounts
    } catch (error) {
      console.error("Erro ao buscar contas a pagar:", error);
      setContasVencidas([]);
    }
  };

  const toggleMobileMenu = () => {
    setOpenMobile(!openMobile);
  };
  
  const hasActiveBirthdays = aniversariantes.length > 0;
  const hasPendingTasks = tarefasPendentes.length > 0;
  const hasOverdueBills = contasVencidas.filter(c => c.status === 'vencida').length > 0;

  const renderSidebarContent = () => (
    <SidebarContent className="bg-white dark:bg-gray-800 h-full">
      <div className="px-3 py-4 border-b dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary dark:text-white">CRM PARA LOJAS</h1>
      </div>
      <SidebarGroup>
        <SidebarGroupLabel className="dark:text-gray-300">Menu</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="space-y-1.5">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path} className="px-1">
                <SidebarMenuButton
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  className={`text-base md:text-base ${isMobile ? 'text-lg' : ''} dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white ${location.pathname === item.path ? "bg-secondary dark:bg-gray-700 dark:text-white" : ""} py-2.5`}
                >
                  <div className="relative">
                    {item.title === "Aniversariantes" ? (
                      <div className={`${hasActiveBirthdays ? 'animate-pulse' : ''}`}>
                        <Gift className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} ${hasActiveBirthdays ? 'text-blue-500' : ''}`} />
                      </div>
                    ) : item.title === "Tarefas" ? (
                      <div className={`${hasPendingTasks ? 'animate-pulse' : ''}`}>
                        <CheckSquare className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} ${hasPendingTasks ? 'text-blue-500' : ''}`} />
                      </div>
                    ) : item.title === "A Pagar" ? (
                      <div className={`${hasOverdueBills ? 'animate-pulse' : ''}`}>
                        <WalletCards className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} ${hasOverdueBills ? 'text-red-500' : ''}`} />
                      </div>
                    ) : (
                      <item.icon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    )}
                    
                    {(item.path === "/aniversariantes" && hasActiveBirthdays) && (
                      <>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      </>
                    )}

                    {(item.path === "/tarefas" && hasPendingTasks) && (
                      <>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      </>
                    )}
                    
                    {(item.path === "/contas-pagar" && hasOverdueBills) && (
                      <>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                      </>
                    )}
                  </div>
                  <span className={`
                    ${item.title === "Aniversariantes" && hasActiveBirthdays ? 'text-blue-500 font-medium' : ''} 
                    ${item.title === "Tarefas" && hasPendingTasks ? 'text-blue-500 font-medium' : ''}
                    ${item.title === "A Pagar" && hasOverdueBills ? 'text-red-500 font-medium' : ''}
                  `}>
                    {item.title}
                  </span>
                  
                  {item.title === "Aniversariantes" && hasActiveBirthdays && (
                    <div className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                      {aniversariantes.length}
                    </div>
                  )}
                  
                  {item.title === "Tarefas" && hasPendingTasks && (
                    <div className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                      {tarefasPendentes.length}
                    </div>
                  )}
                  
                  {item.title === "A Pagar" && hasOverdueBills && (
                    <div className="ml-auto bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">
                      {contasVencidas.filter(c => c.status === 'vencida').length}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-[100] md:hidden bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 dark:border-gray-600 shadow-md"
        onClick={toggleMobileMenu}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {isMobile ? (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent 
            side="left" 
            className="w-[280px] p-0 bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            {renderSidebarContent()}
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar className="hidden md:block">
          {renderSidebarContent()}
        </Sidebar>
      )}
    </>
  );
}
