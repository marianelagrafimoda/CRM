
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Tarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  dataVencimento: string;
}

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: "",
    dataVencimento: new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTarefas();
    }
  }, [user]);

  async function fetchTarefas() {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('owner_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        throw error;
      }

      // Transformar os dados do banco para o formato que usamos na interface
      const tarefasFormatadas = data.map(task => ({
        id: task.id,
        titulo: task.title,
        concluida: task.status === 'completed',
        dataVencimento: task.due_date || new Date().toISOString().split('T')[0]
      }));

      setTarefas(tarefasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      toast({
        title: "Erro ao carregar tarefas",
        description: "Não foi possível carregar suas tarefas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleAdicionarTarefa = async () => {
    if (!novaTarefa.titulo || !user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: novaTarefa.titulo,
          due_date: novaTarefa.dataVencimento,
          status: 'pending',
          priority: 'medium',
          owner_id: user.id
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Adicionar a nova tarefa na lista local
      const novaTarefaFormatada: Tarefa = {
        id: data.id,
        titulo: data.title,
        concluida: false,
        dataVencimento: data.due_date || new Date().toISOString().split('T')[0]
      };

      setTarefas([...tarefas, novaTarefaFormatada]);
      setNovaTarefa({ 
        titulo: "", 
        dataVencimento: new Date().toISOString().split('T')[0] 
      });

      toast({
        title: "Tarefa adicionada",
        description: "Sua tarefa foi adicionada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast({
        title: "Erro ao adicionar tarefa",
        description: "Não foi possível adicionar a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const toggleTarefaConcluida = async (id: string, concluida: boolean) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: concluida ? 'pending' : 'completed'
        })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      // Atualizar o estado local
      const tarefasAtualizadas = tarefas.map(tarefa =>
        tarefa.id === id ? { ...tarefa, concluida: !concluida } : tarefa
      );
      setTarefas(tarefasAtualizadas);

      toast({
        title: concluida ? "Tarefa reaberta" : "Tarefa concluída",
        description: concluida 
          ? "A tarefa foi marcada como pendente novamente." 
          : "A tarefa foi marcada como concluída com sucesso.",
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

  const handleExcluirTarefa = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      // Remover do estado local
      const tarefasAtualizadas = tarefas.filter(tarefa => tarefa.id !== id);
      setTarefas(tarefasAtualizadas);

      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast({
        title: "Erro ao excluir tarefa",
        description: "Não foi possível excluir a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold">Tarefas</h1>

      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Nova Tarefa</h2>
          <div className="flex flex-col gap-4">
            <Input
              id="novaTarefaForm"
              placeholder="Título da tarefa"
              value={novaTarefa.titulo}
              onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
            />
            <Input
              type="date"
              value={novaTarefa.dataVencimento}
              onChange={(e) => setNovaTarefa({ ...novaTarefa, dataVencimento: e.target.value })}
            />
            <Button 
              className="bg-[#9b87f5] hover:bg-[#7e69ab] w-full md:w-auto"
              onClick={handleAdicionarTarefa}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tarefa
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b87f5]"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {tarefas.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-500">Nenhuma tarefa encontrada</h3>
              <p className="text-gray-400 mt-2">Adicione novas tarefas para começar</p>
            </Card>
          ) : (
            tarefas.map((tarefa) => (
              <Card key={tarefa.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <button 
                      className={`text-2xl transition-colors ${tarefa.concluida ? 'text-green-500' : 'text-gray-400 hover:text-[#9b87f5]'}`}
                      onClick={() => toggleTarefaConcluida(tarefa.id, tarefa.concluida)}
                    >
                      <CheckSquare className="w-6 h-6" />
                    </button>
                    <div className={`flex-1 ${tarefa.concluida ? 'line-through text-gray-500' : ''}`}>
                      <h3 className="font-medium">{tarefa.titulo}</h3>
                      <p className="text-sm text-gray-500">Vence em: {tarefa.dataVencimento}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleExcluirTarefa(tarefa.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
