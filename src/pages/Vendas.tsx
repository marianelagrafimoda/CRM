
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, parseISO, isAfter, startOfDay, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, FileText, Archive, Trash2, RefreshCcw, Edit2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Venda {
  id: string;
  valor: number;
  data: string;
  produto?: string;
  arquivada?: boolean;
  dia?: string;
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [vendaSendoEditada, setVendaSendoEditada] = useState<Venda | null>(null);
  const [diasAbertos, setDiasAbertos] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const obterDataHoraAtual = () => {
    const agora = new Date();
    return format(agora, "yyyy-MM-dd'T'HH:mm");
  };

  const [novaVenda, setNovaVenda] = useState({
    valor: "",
    produto: "",
    data: obterDataHoraAtual(),
  });

  useEffect(() => {
    if (user) {
      fetchVendas();
    }
  }, [user]);

  const fetchVendas = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const vendasFormatadas = data.map(sale => ({
        id: sale.id,
        valor: sale.total_amount,
        data: sale.created_at,
        produto: sale.payment_method,
        arquivada: sale.status === 'archived',
        dia: format(parseISO(sale.created_at), 'yyyy-MM-dd')
      }));

      setVendas(vendasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast({
        title: "Erro ao carregar vendas",
        description: "Não foi possível carregar suas vendas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrarVenda = async () => {
    if (!novaVenda.valor || !user) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor para a venda",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sales')
        .insert({
          total_amount: parseFloat(novaVenda.valor),
          payment_method: novaVenda.produto || null,
          created_at: novaVenda.data,
          owner_id: user.id,
          status: 'completed'
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const novaVendaFormatada: Venda = {
        id: data.id,
        valor: data.total_amount,
        produto: data.payment_method || "",
        data: data.created_at,
        arquivada: false,
        dia: format(parseISO(data.created_at), 'yyyy-MM-dd')
      };

      setVendas([novaVendaFormatada, ...vendas]);

      toast({
        title: "Venda registrada",
        description: `Venda de ${formatarValor(novaVendaFormatada.valor)} registrada com sucesso!`,
      });

      setNovaVenda({
        valor: "",
        produto: "",
        data: obterDataHoraAtual(),
      });
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast({
        title: "Erro ao registrar venda",
        description: "Não foi possível registrar a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleArquivarVenda = async (id: string) => {
    if (!user) return;
    
    const vendaAtual = vendas.find(v => v.id === id);
    if (!vendaAtual) return;
    
    const novoStatus = vendaAtual.arquivada ? 'completed' : 'archived';
    
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          status: novoStatus
        })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      const vendasAtualizadas = vendas.map(venda => 
        venda.id === id 
          ? { ...venda, arquivada: !venda.arquivada }
          : venda
      );
      setVendas(vendasAtualizadas);

      toast({
        title: "Venda atualizada",
        description: "Status da venda atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      toast({
        title: "Erro ao atualizar venda",
        description: "Não foi possível atualizar o status da venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteAlertOpen(true);
  };

  const handleExcluirVenda = async () => {
    if (!itemToDelete || !user) return;
    
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', itemToDelete)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      const vendasAtualizadas = vendas.filter(venda => venda.id !== itemToDelete);
      setVendas(vendasAtualizadas);

      toast({
        title: "Venda excluída",
        description: "Venda removida com sucesso!",
      });
      
      setDeleteAlertOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: "Erro ao excluir venda",
        description: "Não foi possível excluir a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSalvarEdicao = async () => {
    if (!vendaSendoEditada || !user) return;
    
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          total_amount: vendaSendoEditada.valor,
          payment_method: vendaSendoEditada.produto || null,
          created_at: vendaSendoEditada.data
        })
        .eq('id', vendaSendoEditada.id)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }
      
      const vendasAtualizadas = vendas.map(venda => 
        venda.id === vendaSendoEditada.id 
          ? { ...vendaSendoEditada, dia: format(parseISO(vendaSendoEditada.data), 'yyyy-MM-dd') }
          : venda
      );
      
      setVendas(vendasAtualizadas);
      
      toast({
        title: "Venda atualizada",
        description: "As informações da venda foram atualizadas com sucesso!",
      });
      
      setVendaSendoEditada(null);
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      toast({
        title: "Erro ao atualizar venda",
        description: "Não foi possível atualizar a venda. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (data: string) => {
    return format(parseISO(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  const toggleDia = (dia: string) => {
    setDiasAbertos(prev => ({
      ...prev,
      [dia]: !prev[dia]
    }));
  };

  const vendasFiltradas = vendas.filter(venda => venda.arquivada === mostrarArquivadas);

  const agruparVendasPorDia = () => {
    if (!mostrarArquivadas) return {};
    
    return vendasFiltradas.reduce((grupos: Record<string, Venda[]>, venda) => {
      const dia = venda.dia || 'sem-data';
      if (!grupos[dia]) {
        grupos[dia] = [];
      }
      grupos[dia].push(venda);
      return grupos;
    }, {});
  };

  const vendasAgrupadasPorDia = agruparVendasPorDia();
  const diasOrdenados = Object.keys(vendasAgrupadasPorDia).sort((a, b) => {
    return b.localeCompare(a);
  });

  const renderVendaInfo = (venda: Venda) => (
    <div>
      <p className="font-medium">{formatarValor(venda.valor)}</p>
      {venda.produto && <p className="text-sm text-blue-500">{venda.produto}</p>}
      <p className="text-sm text-muted-foreground">
        {formatarData(venda.data)}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Controle de Vendas</h1>
        <p className="text-muted-foreground">
          Registre e gerencie suas vendas
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid gap-4">
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Valor da venda"
              type="number"
              step="0.01"
              min="0"
              className="pl-10"
              value={novaVenda.valor}
              onChange={(e) => setNovaVenda({ ...novaVenda, valor: e.target.value })}
            />
          </div>
          <div className="relative">
            <Input
              placeholder="Produto (opcional)"
              type="text"
              className="pl-3"
              value={novaVenda.produto}
              onChange={(e) => setNovaVenda({ ...novaVenda, produto: e.target.value })}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-white" />
            <Input
              type="datetime-local"
              className="pl-10"
              value={novaVenda.data}
              onChange={(e) => setNovaVenda({ ...novaVenda, data: e.target.value })}
            />
          </div>
          <Button
            className="w-full bg-[#9b87f5] hover:bg-[#7e69ab]"
            onClick={handleRegistrarVenda}
          >
            <FileText className="w-4 h-4 mr-2" />
            Registrar Venda
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setMostrarArquivadas(!mostrarArquivadas)}
        >
          {mostrarArquivadas ? (
            <>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Mostrar Ativas
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 mr-2" />
              Mostrar Arquivadas
            </>
          )}
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {mostrarArquivadas ? "Vendas Arquivadas" : "Vendas Recentes"}
        </h2>
        
        {!mostrarArquivadas && (
          <div className="space-y-4">
            {vendasFiltradas.map((venda) => (
              <div
                key={venda.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  {renderVendaInfo(venda)}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setVendaSendoEditada(venda)}
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleArquivarVenda(venda.id)}
                  >
                    <Archive className={`w-4 h-4 ${venda.arquivada ? "text-blue-500" : ""}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => confirmDelete(venda.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            
            {vendasFiltradas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda ativa no momento.
              </div>
            )}
          </div>
        )}
        
        {mostrarArquivadas && (
          <div className="space-y-4">
            {diasOrdenados.map((dia) => (
              <Collapsible key={dia}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#9b87f5]" />
                      <h3 className="font-medium">
                        {format(parseISO(dia), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        ({vendasAgrupadasPorDia[dia].length} vendas)
                      </span>
                    </div>
                    {diasAbertos[dia] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-2 mt-2">
                  {vendasAgrupadasPorDia[dia].map((venda) => (
                    <div
                      key={venda.id}
                      className="flex items-center justify-between p-4 border rounded-lg ml-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{formatarValor(venda.valor)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(venda.data), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setVendaSendoEditada(venda)}
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleArquivarVenda(venda.id)}
                        >
                          <RefreshCcw className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => confirmDelete(venda.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {diasOrdenados.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda arquivada no momento.
              </div>
            )}
          </div>
        )}
      </Card>
      
      <Dialog open={!!vendaSendoEditada} onOpenChange={(open) => !open && setVendaSendoEditada(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>
          {vendaSendoEditada && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="valor" className="text-sm font-medium">Valor</label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={vendaSendoEditada.valor}
                  onChange={(e) => setVendaSendoEditada({
                    ...vendaSendoEditada,
                    valor: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="produto" className="text-sm font-medium">Produto (opcional)</label>
                <Input
                  id="produto"
                  type="text"
                  value={vendaSendoEditada.produto || ''}
                  onChange={(e) => setVendaSendoEditada({
                    ...vendaSendoEditada,
                    produto: e.target.value
                  })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="data" className="text-sm font-medium">Data e Hora</label>
                <Input
                  id="data"
                  type="datetime-local"
                  value={vendaSendoEditada.data}
                  onChange={(e) => setVendaSendoEditada({
                    ...vendaSendoEditada,
                    data: e.target.value
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSalvarEdicao}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluirVenda}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
