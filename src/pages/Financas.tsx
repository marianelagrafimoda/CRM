
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Trash, 
  Archive, 
  Edit,
  Plus,
  RefreshCcw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";

interface Financa {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  status: string;
  data_vencimento: string | null;
  created_at: string;
}

interface Venda {
  id: string;
  valor: number;
  data: string;
  arquivada?: boolean;
}

const categorias = {
  receita: ['Vendas', 'Serviços', 'Investimentos', 'Outros'],
  despesa: ['Materiais', 'Aluguel', 'Luz', 'Água', 'Internet', 'Telefone', 'Impostos', 'Salários', 'Outros'],
  fixa: ['Aluguel', 'Luz', 'Água', 'Internet', 'Telefone', 'Impostos', 'Salários', 'Outros']
};

const Financas = () => {
  const [financas, setFinancas] = useState<Financa[]>([]);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<string>("receita");
  const [categoria, setCategoria] = useState<string>("");
  const [categoriaOutro, setCategoriaOutro] = useState<string>("");
  const [dataVencimento, setDataVencimento] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<string>("ativos");
  const { user } = useAuth();
  
  // Dashboard stats
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [totalFixas, setTotalFixas] = useState(0);
  const [saldoTotal, setSaldoTotal] = useState(0);

  useEffect(() => {
    if (user) {
      fetchFinancas();
      fetchDashboardData();

      // Set up realtime subscription
      const channel = supabase
        .channel('public:financas')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'financas'
        }, () => {
          fetchFinancas();
          fetchDashboardData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Reset categoria when tipo changes
  useEffect(() => {
    setCategoria("");
    setCategoriaOutro("");
  }, [tipo]);

  // Calculate saldo whenever the totals change
  useEffect(() => {
    setSaldoTotal(totalReceitas - totalDespesas - totalFixas);
  }, [totalReceitas, totalDespesas, totalFixas]);

  const fetchFinancas = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('financas')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setFinancas(data || []);
    } catch (error) {
      console.error("Erro ao buscar finanças:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Fetch financas for dashboard
      const { data: financasData, error: financasError } = await supabase
        .from('financas')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'ativo');

      if (financasError) throw financasError;

      // Calculate totals for active finances
      let receitas = 0;
      let despesas = 0;
      let fixas = 0;

      financasData?.forEach(item => {
        if (item.tipo === 'receita') {
          receitas += item.valor;
        } else if (item.tipo === 'despesa') {
          despesas += item.valor;
        } else if (item.tipo === 'fixa') {
          fixas += item.valor;
        }
      });

      setTotalReceitas(receitas);
      setTotalDespesas(despesas);
      setTotalFixas(fixas);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para adicionar um registro financeiro",
        variant: "destructive",
      });
      return;
    }

    if (!descricao || !valor || !tipo || !categoria) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare categoria value - use custom input if "Outros" is selected
      const categoriaFinal = categoria === "Outros" && categoriaOutro ? categoriaOutro : categoria;
      
      let result;
      if (isEditing && currentId) {
        // Update existing finance
        result = await supabase
          .from('financas')
          .update({
            descricao,
            valor: parseFloat(valor),
            tipo,
            categoria: categoriaFinal,
            data_vencimento: dataVencimento || null,
            owner_id: user.id
          })
          .eq('id', currentId);
      } else {
        // Insert new finance - Make sure to include owner_id
        result = await supabase
          .from('financas')
          .insert({
            descricao,
            valor: parseFloat(valor),
            tipo,
            categoria: categoriaFinal,
            data_vencimento: dataVencimento || null,
            owner_id: user.id
          });
      }

      if (result.error) {
        throw result.error;
      }

      // Clear form
      setDescricao("");
      setValor("");
      setTipo("receita");
      setCategoria("");
      setCategoriaOutro("");
      setDataVencimento("");
      setIsEditing(false);
      setCurrentId(null);
      setDialogOpen(false);

      toast({
        title: "Sucesso",
        description: isEditing ? "Registro atualizado com sucesso" : "Registro adicionado com sucesso",
      });

      await fetchFinancas();
      await fetchDashboardData();
    } catch (error) {
      console.error("Erro ao salvar finança:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro financeiro",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (financa: Financa) => {
    setDescricao(financa.descricao);
    setValor(financa.valor.toString());
    setTipo(financa.tipo);
    
    // Handle custom 'Outros' categoria
    if (categorias[financa.tipo as keyof typeof categorias].includes(financa.categoria)) {
      setCategoria(financa.categoria);
      setCategoriaOutro("");
    } else {
      setCategoria("Outros");
      setCategoriaOutro(financa.categoria);
    }
    
    setDataVencimento(financa.data_vencimento || "");
    setIsEditing(true);
    setCurrentId(financa.id);
    setDialogOpen(true);
  };

  const handleArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from('financas')
        .update({ status: 'arquivado' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Registro arquivado com sucesso",
      });

      await fetchFinancas();
      await fetchDashboardData();
    } catch (error) {
      console.error("Erro ao arquivar finança:", error);
      toast({
        title: "Erro",
        description: "Não foi possível arquivar o registro",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('financas')
        .update({ status: 'ativo' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Registro restaurado com sucesso",
      });

      await fetchFinancas();
      await fetchDashboardData();
    } catch (error) {
      console.error("Erro ao restaurar finança:", error);
      toast({
        title: "Erro",
        description: "Não foi possível restaurar o registro",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const { error } = await supabase
        .from('financas')
        .delete()
        .eq('id', itemToDelete);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Registro excluído com sucesso",
      });

      await fetchFinancas();
      await fetchDashboardData();
      setDeleteAlertOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir finança:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro",
        variant: "destructive",
      });
    }
  };

  const getFilteredFinancas = () => {
    if (activeTab === "arquivados") {
      // For archived items
      const arquivados = financas.filter(financa => financa.status === 'arquivado');
      if (filtroTipo === "todos") {
        return arquivados;
      }
      return arquivados.filter(financa => financa.tipo === filtroTipo);
    } else {
      // For active items
      const ativos = financas.filter(financa => financa.status === 'ativo');
      if (filtroTipo === "todos") {
        return ativos;
      }
      return ativos.filter(financa => financa.tipo === filtroTipo);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "receita":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "despesa":
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case "fixa":
        return <Wallet className="w-5 h-5 text-blue-500" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getStatusClass = (tipo: string) => {
    switch (tipo) {
      case "receita":
        return "text-green-600 dark:text-green-400";
      case "despesa":
        return "text-red-600 dark:text-red-400";
      case "fixa":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "";
    }
  };

  const handleAddNew = () => {
    setDescricao("");
    setValor("");
    setTipo("receita");
    setCategoria("");
    setCategoriaOutro("");
    setDataVencimento("");
    setIsEditing(false);
    setCurrentId(null);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">Gestão Financeira</h1>
        <Button onClick={handleAddNew} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo lançamento
        </Button>
      </div>

      {/* Dashboard Cards - 2 per row on all devices */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalReceitas)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalDespesas)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-600 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Custos Fixos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalFixas)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-purple-600 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Balanço Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldoTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ativos" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ativos">Lançamentos Ativos</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ativos" className="space-y-6">
          <div className="mb-6">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
                <SelectItem value="fixa">Fixas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {getFilteredFinancas().map((financa) => (
              <AccordionItem key={financa.id} value={financa.id}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(financa.tipo)}
                      <span className="font-medium">{financa.descricao}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${getStatusClass(financa.tipo)}`}>
                        {formatCurrency(financa.valor)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Categoria</p>
                        <p>{financa.categoria}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                        <p className="capitalize">{financa.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Data de Criação</p>
                        <p>{formatDate(financa.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Vencimento</p>
                        <p>{financa.data_vencimento ? formatDate(financa.data_vencimento) : "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:justify-end gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(financa)} className="w-full md:w-auto">
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleArchive(financa.id)} className="w-full md:w-auto">
                        <Archive className="h-4 w-4 mr-1" /> Arquivar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(financa.id)} className="w-full md:w-auto">
                        <Trash className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {getFilteredFinancas().length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum registro financeiro encontrado para o filtro selecionado.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="arquivados" className="space-y-6">
          <div className="mb-6">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
                <SelectItem value="fixa">Fixas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {getFilteredFinancas().map((financa) => (
              <AccordionItem key={financa.id} value={financa.id}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(financa.tipo)}
                      <span className="font-medium">{financa.descricao}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${getStatusClass(financa.tipo)}`}>
                        {formatCurrency(financa.valor)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Categoria</p>
                        <p>{financa.categoria}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                        <p className="capitalize">{financa.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Data de Criação</p>
                        <p>{formatDate(financa.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Vencimento</p>
                        <p>{financa.data_vencimento ? formatDate(financa.data_vencimento) : "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:justify-end gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleRestore(financa.id)} className="w-full md:w-auto">
                        <RefreshCcw className="h-4 w-4 mr-1" /> Restaurar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(financa.id)} className="w-full md:w-auto">
                        <Trash className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {getFilteredFinancas().length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum registro financeiro arquivado encontrado para o filtro selecionado.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do lançamento financeiro abaixo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tipo" className="text-right">
                  Tipo
                </Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="fixa">Fixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="descricao" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="valor" className="text-right">
                  Valor
                </Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoria" className="text-right">
                  Categoria
                </Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipo && categorias[tipo as keyof typeof categorias].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Conditional field for "Outros" */}
              {categoria === "Outros" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="categoriaOutro" className="text-right">
                    Especifique
                  </Label>
                  <Input
                    id="categoriaOutro"
                    value={categoriaOutro}
                    onChange={(e) => setCategoriaOutro(e.target.value)}
                    placeholder="Especifique a categoria"
                    className="col-span-3"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dataVencimento" className="text-right">
                  Vencimento
                </Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{isEditing ? "Salvar alterações" : "Adicionar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro financeiro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Financas;
