
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Search, Plus, MoreVertical, Star, WalletCards, AlertTriangle, Check, Archive, Trash2, WalletCardsIcon, Edit2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { parseISO, format, isBefore, isToday, addDays, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  importante: boolean;
  categoria: string;
}

export default function ContasPagar() {
  const [busca, setBusca] = useState("");
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [contasArquivadas, setContasArquivadas] = useState<ContaPagar[]>([]);
  const [currentTab, setCurrentTab] = useState("ativas");
  const [isLoading, setIsLoading] = useState(true);
  const [novaConta, setNovaConta] = useState({
    descricao: "",
    valor: "",
    data_vencimento: new Date().toISOString().split('T')[0],
    categoria: "geral",
    importante: false
  });
  const [contaEditando, setContaEditando] = useState<ContaPagar | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (user) {
      fetchContas();
    }
  }, [user, currentTab]);

  const fetchContas = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Para contas ativas (pendentes ou vencidas)
      const { data: ativas, error: errorAtivas } = await supabase
        .from('financas')
        .select('*')
        .eq('owner_id', user.id)
        .eq('tipo', 'despesa')
        .neq('status', 'arquivada')
        .neq('status', 'paga')
        .order('data_vencimento', { ascending: true });
        
      if (errorAtivas) throw errorAtivas;
      
      // Para contas arquivadas ou pagas
      const { data: arquivadas, error: errorArquivadas } = await supabase
        .from('financas')
        .select('*')
        .eq('owner_id', user.id)
        .eq('tipo', 'despesa')
        .or('status.eq.arquivada,status.eq.paga')
        .order('data_vencimento', { ascending: false });
      
      if (errorArquivadas) throw errorArquivadas;
      
      // Verificar e atualizar contas vencidas
      const contasAtualizadas = ativas?.map(conta => {
        const dataVencimento = parseISO(conta.data_vencimento);
        let status = conta.status;
        
        // Atualiza o status para "vencida" se passou da data de vencimento
        if (status === 'pendente' && isBefore(dataVencimento, hoje)) {
          status = 'vencida';
          // Atualiza o status no banco de dados
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
        }
        
        return {
          id: conta.id,
          descricao: conta.descricao,
          valor: conta.valor,
          data_vencimento: conta.data_vencimento,
          status: status,
          importante: conta.importante || false,
          categoria: conta.categoria
        };
      }) || [];
      
      const contasArquivadasFormatadas = arquivadas?.map(conta => ({
        id: conta.id,
        descricao: conta.descricao,
        valor: conta.valor,
        data_vencimento: conta.data_vencimento,
        status: conta.status,
        importante: conta.importante || false,
        categoria: conta.categoria
      })) || [];
      
      setContas(contasAtualizadas);
      setContasArquivadas(contasArquivadasFormatadas);
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
      toast({
        title: "Erro ao buscar contas",
        description: "Não foi possível carregar as contas a pagar. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarConta = async () => {
    if (!user) return;
    
    if (!novaConta.descricao || !novaConta.valor || !novaConta.data_vencimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const valorNumerico = parseFloat(novaConta.valor.replace(',', '.'));
      
      if (isNaN(valorNumerico)) {
        toast({
          title: "Valor inválido",
          description: "O valor deve ser um número válido.",
          variant: "destructive"
        });
        return;
      }
      
      // Determinar o status com base na data de vencimento
      const dataVencimento = parseISO(novaConta.data_vencimento);
      const status = isBefore(dataVencimento, hoje) ? 'vencida' : 'pendente';
      
      if (contaEditando) {
        // Atualizando conta existente
        const { error } = await supabase
          .from('financas')
          .update({
            descricao: novaConta.descricao,
            valor: valorNumerico,
            data_vencimento: novaConta.data_vencimento,
            categoria: novaConta.categoria,
            importante: novaConta.importante,
            status: status
          })
          .eq('id', contaEditando.id)
          .eq('owner_id', user.id);
        
        if (error) throw error;
        
        toast({
          title: "Conta atualizada",
          description: "A conta foi atualizada com sucesso."
        });
      } else {
        // Criando nova conta
        const { error } = await supabase
          .from('financas')
          .insert([{
            descricao: novaConta.descricao,
            valor: valorNumerico,
            data_vencimento: novaConta.data_vencimento,
            categoria: novaConta.categoria,
            importante: novaConta.importante,
            status: status,
            tipo: 'despesa',
            owner_id: user.id
          }]);
        
        if (error) throw error;
        
        toast({
          title: "Conta adicionada",
          description: "A conta a pagar foi adicionada com sucesso."
        });
      }
      
      // Limpar formulário
      setNovaConta({
        descricao: "",
        valor: "",
        data_vencimento: new Date().toISOString().split('T')[0],
        categoria: "geral",
        importante: false
      });
      setContaEditando(null);
      setSheetOpen(false);
      
      // Recarregar contas
      fetchContas();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a conta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarConta = (conta: ContaPagar) => {
    setContaEditando(conta);
    setNovaConta({
      descricao: conta.descricao,
      valor: conta.valor.toString(),
      data_vencimento: conta.data_vencimento,
      categoria: conta.categoria || "geral",
      importante: conta.importante
    });
    setSheetOpen(true);
  };

  const handleMarcarComoPaga = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('financas')
        .update({ status: 'paga' })
        .eq('id', id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Conta paga",
        description: "A conta foi marcada como paga."
      });
      
      fetchContas();
    } catch (error) {
      console.error("Erro ao marcar como paga:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status da conta.",
        variant: "destructive"
      });
    }
  };

  const handleArquivarConta = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('financas')
        .update({ status: 'arquivada' })
        .eq('id', id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Conta arquivada",
        description: "A conta foi arquivada com sucesso."
      });
      
      fetchContas();
    } catch (error) {
      console.error("Erro ao arquivar conta:", error);
      toast({
        title: "Erro ao arquivar",
        description: "Não foi possível arquivar a conta.",
        variant: "destructive"
      });
    }
  };

  const handleRestaurarConta = async (id: string) => {
    if (!user) return;
    
    try {
      const conta = contasArquivadas.find(c => c.id === id);
      
      if (!conta) {
        throw new Error("Conta não encontrada");
      }
      
      // Determinar o status correto para restauração
      const dataVencimento = parseISO(conta.data_vencimento);
      const novoStatus = isBefore(dataVencimento, hoje) ? 'vencida' : 'pendente';
      
      const { error } = await supabase
        .from('financas')
        .update({ status: novoStatus })
        .eq('id', id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Conta restaurada",
        description: "A conta foi restaurada com sucesso."
      });
      
      fetchContas();
    } catch (error) {
      console.error("Erro ao restaurar conta:", error);
      toast({
        title: "Erro ao restaurar",
        description: "Não foi possível restaurar a conta.",
        variant: "destructive"
      });
    }
  };

  const handleToggleImportante = async (id: string, atual: boolean) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('financas')
        .update({ importante: !atual })
        .eq('id', id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: atual ? "Prioridade removida" : "Marcada como importante",
        description: atual 
          ? "A conta não está mais marcada como importante." 
          : "A conta foi marcada como importante e será exibida no topo."
      });
      
      fetchContas();
    } catch (error) {
      console.error("Erro ao atualizar prioridade:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a prioridade da conta.",
        variant: "destructive"
      });
    }
  };

  const handleExcluirConta = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('financas')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Conta excluída",
        description: "A conta foi excluída permanentemente."
      });
      
      fetchContas();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a conta.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const data = parseISO(dataVencimento);
    const emBreve = isValid(data) && !isBefore(data, hoje) && isBefore(data, addDays(hoje, 3));
    
    if (status === 'vencida') {
      return <Badge variant="destructive" className="ml-2">Vencida</Badge>;
    } else if (status === 'paga') {
      return <Badge variant="outline" className="bg-green-100 text-green-800 ml-2">Paga</Badge>;
    } else if (status === 'arquivada') {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 ml-2">Arquivada</Badge>;
    } else if (emBreve) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 ml-2">Vence em breve</Badge>;
    }
    
    return <Badge variant="outline" className="bg-blue-100 text-blue-800 ml-2">Pendente</Badge>;
  };

  const contasFiltradas = currentTab === "ativas" 
    ? contas.filter(conta => 
        conta.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        conta.categoria.toLowerCase().includes(busca.toLowerCase()))
    : contasArquivadas.filter(conta => 
        conta.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        conta.categoria.toLowerCase().includes(busca.toLowerCase()));

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie suas despesas e pagamentos</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button className="bg-[#9b87f5] hover:bg-[#7e69ab] w-full md:w-auto" onClick={() => {
              setContaEditando(null);
              setNovaConta({
                descricao: "",
                valor: "",
                data_vencimento: new Date().toISOString().split('T')[0],
                categoria: "geral",
                importante: false
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-white">
            <SheetHeader>
              <SheetTitle>{contaEditando ? "Editar Conta" : "Adicionar Nova Conta"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Input
                  placeholder="Descrição (ex: Aluguel, Luz, Internet)"
                  value={novaConta.descricao}
                  onChange={(e) => setNovaConta({ ...novaConta, descricao: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="Valor (R$)"
                  value={novaConta.valor}
                  onChange={(e) => {
                    // Aceitar apenas números e vírgula
                    const value = e.target.value.replace(/[^0-9,.]/g, '');
                    setNovaConta({ ...novaConta, valor: value });
                  }}
                />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Data de Vencimento</p>
                <Input
                  type="date"
                  value={novaConta.data_vencimento}
                  onChange={(e) => setNovaConta({ ...novaConta, data_vencimento: e.target.value })}
                />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Categoria</p>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={novaConta.categoria}
                  onChange={(e) => setNovaConta({ ...novaConta, categoria: e.target.value })}
                >
                  <option value="geral">Geral</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="utilities">Serviços (Água, Luz, etc)</option>
                  <option value="internet">Internet/Telefone</option>
                  <option value="fornecedores">Fornecedores</option>
                  <option value="impostos">Impostos</option>
                  <option value="funcionarios">Funcionários</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="importante"
                  checked={novaConta.importante}
                  onChange={(e) => setNovaConta({ ...novaConta, importante: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="importante" className="text-sm text-gray-700">Marcar como importante</label>
              </div>
              <Button 
                className="w-full bg-[#9b87f5] hover:bg-[#7e69ab]"
                onClick={handleSalvarConta}
                disabled={isLoading}
              >
                {isLoading ? "Processando..." : contaEditando ? "Atualizar Conta" : "Adicionar Conta"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs defaultValue="ativas" onValueChange={setCurrentTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="ativas" className="flex-1">Contas Ativas</TabsTrigger>
          <TabsTrigger value="arquivadas" className="flex-1">Arquivadas/Pagas</TabsTrigger>
        </TabsList>
        
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar contas..."
            className="pl-10 w-full"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <TabsContent value="ativas" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : contasFiltradas.length === 0 ? (
            <Card className="p-8 text-center">
              <WalletCards className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma conta a pagar encontrada.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contasFiltradas.map(conta => (
                <Card 
                  key={conta.id} 
                  className={`p-4 transition-all duration-200 ${
                    conta.status === 'vencida' 
                      ? 'border-l-4 border-l-red-500 bg-red-50' 
                      : conta.importante 
                        ? 'border-l-4 border-l-yellow-500 bg-yellow-50' 
                        : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center">
                      <div className="mr-3 text-gray-500">
                        <WalletCards className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-semibold">
                            {conta.descricao}
                            {conta.importante && (
                              <Star className="w-4 h-4 inline-block ml-1 fill-yellow-400 text-yellow-400" />
                            )}
                          </h3>
                          {getStatusBadge(conta.status, conta.data_vencimento)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Vencimento: {format(parseISO(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="font-medium text-lg">
                          {formatarValor(conta.valor)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleMarcarComoPaga(conta.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Pagar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditarConta(conta)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleImportante(conta.id, conta.importante)}>
                            {conta.importante ? "Remover importância" : "Marcar como importante"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArquivarConta(conta.id)}>
                            Arquivar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600">
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleExcluirConta(conta.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="arquivadas" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : contasFiltradas.length === 0 ? (
            <Card className="p-8 text-center">
              <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma conta arquivada ou paga encontrada.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contasFiltradas.map(conta => (
                <Card key={conta.id} className="p-4 opacity-80">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center">
                      <div className="mr-3 text-gray-500">
                        <WalletCards className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-semibold">{conta.descricao}</h3>
                          {getStatusBadge(conta.status, conta.data_vencimento)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Vencimento: {format(parseISO(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="font-medium text-lg">
                          {formatarValor(conta.valor)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestaurarConta(conta.id)}
                      >
                        Restaurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditarConta(conta)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir permanentemente esta conta?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleExcluirConta(conta.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
