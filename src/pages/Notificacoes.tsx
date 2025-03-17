
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Tarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  dataVencimento: string;
}

export default function Notificacoes() {
  const [tarefasPendentes, setTarefasPendentes] = useState<Tarefa[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTarefasPendentes();
    } else {
      setLoading(false);
    }

    // Setup real-time subscription for task updates
    const channel = supabase
      .channel('public:tasks')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks'
      }, handleTaskChange)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'tasks'
      }, handleTaskChange)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tasks'
      }, handleTaskChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const handleTaskChange = () => {
    // Refresh tasks when there's a change
    fetchTarefasPendentes();
  };

  async function fetchTarefasPendentes() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .eq('owner_id', user?.id);

      if (error) {
        throw error;
      }

      // Transformar os dados do banco para o formato que usamos na interface
      const tarefasFormatadas = data.map(task => ({
        id: task.id,
        titulo: task.title,
        concluida: false,
        dataVencimento: task.due_date || new Date().toISOString().split('T')[0]
      }));

      setTarefasPendentes(tarefasFormatadas);
    } catch (error) {
      console.error("Erro ao buscar tarefas pendentes:", error);
    } finally {
      setLoading(false);
    }
  }

  const toggleTarefaConcluida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed'
        })
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (error) {
        throw error;
      }

      // Remove a tarefa da lista local
      setTarefasPendentes(tarefasPendentes.filter(tarefa => tarefa.id !== id));

      toast({
        title: "Tarefa concluída",
        description: "A tarefa foi marcada como concluída com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast({
        title: "Erro ao atualizar tarefa",
        description: "Não foi possível atualizar o status da tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b87f5]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe suas tarefas pendentes
          </p>
        </div>
        <div className="flex space-x-2">
          {tarefasPendentes.length > 0 && (
            <div className="relative">
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
              <CheckSquare className="w-6 h-6 text-blue-500" />
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="tasks" className="relative">
            Tarefas
            {tarefasPendentes.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                {tarefasPendentes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <div className="grid gap-6">
            {tarefasPendentes.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold">Tarefas Pendentes</h2>
                </div>
                <div className="space-y-4">
                  {tarefasPendentes.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                          <p className="font-medium">{tarefa.titulo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {tarefa.dataVencimento ? format(parseISO(tarefa.dataVencimento), "dd/MM/yyyy", { locale: ptBR }) : "Sem data"}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleTarefaConcluida(tarefa.id)}
                          >
                            Concluir
                          </Button>
                        </div>
                      </div>
                      <Progress 
                        value={0} 
                        className="h-2 bg-gray-100" 
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {tarefasPendentes.length === 0 && (
              <Card className="p-6 flex flex-col items-center justify-center text-center">
                <CheckSquare className="w-12 h-12 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Nenhuma tarefa pendente</h2>
                <p className="text-muted-foreground">
                  Você está em dia com suas tarefas!
                </p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
