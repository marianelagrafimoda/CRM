
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Star, Trash2, Mail, Phone, Calendar, Edit2, ChevronDown, ChevronUp, Gift, MessageSquare, Home, AtSign } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { isSameDay } from "date-fns";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  aniversario: string;
  classificacao: number;
  endereco?: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    telefone: "",
    email: "",
    aniversario: "",
    classificacao: 1,
    endereco: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch clientes from Supabase on component mount
  useEffect(() => {
    const fetchClientes = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('owner_id', user.id)
          .order('name');
          
        if (error) throw error;
        
        // Map Supabase data format to our Cliente interface
        const mappedClientes: Cliente[] = data.map(item => ({
          id: item.id,
          nome: item.name,
          telefone: item.phone || '',
          email: item.email || '',
          aniversario: item.birthday || '',
          classificacao: item.classification || 1,
          endereco: item.address || ''
        }));
        
        setClientes(mappedClientes);
      } catch (error) {
        console.error('Error fetching clientes:', error);
        toast({
          title: "Erro ao carregar clientes",
          description: "Não foi possível carregar seus clientes. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientes();
    
    // Set up a real-time subscription for live updates
    const channel = supabase
      .channel('public:customers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers' },
        payload => {
          fetchClientes();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleAdicionarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone || !novoCliente.email) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha nome, telefone e email do cliente.",
        variant: "destructive",
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Não autenticado",
        description: "Você precisa estar logado para adicionar clientes.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare data for Supabase (map our interface to Supabase schema)
      const customerData = {
        name: novoCliente.nome,
        phone: novoCliente.telefone,
        email: novoCliente.email,
        birthday: novoCliente.aniversario,
        classification: novoCliente.classificacao,
        address: novoCliente.endereco,
        owner_id: user.id
      };
      
      if (editingClient) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingClient.id);
          
        if (error) throw error;
        
        toast({
          title: "Cliente atualizado",
          description: "Os dados do cliente foram atualizados com sucesso.",
        });
      } else {
        // Insert new customer
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);
          
        if (error) throw error;
        
        toast({
          title: "Cliente adicionado",
          description: "O cliente foi adicionado com sucesso.",
        });
      }
      
      // Reset form
      setNovoCliente({
        nome: "",
        telefone: "",
        email: "",
        aniversario: "",
        classificacao: 1,
        endereco: "",
      });
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast({
        title: "Erro ao salvar cliente",
        description: "Não foi possível salvar os dados do cliente. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluirCliente = async (id: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast({
        title: "Erro ao excluir cliente",
        description: "Não foi possível excluir o cliente. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setEditingClient(cliente);
    setNovoCliente({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      aniversario: cliente.aniversario,
      classificacao: cliente.classificacao,
      endereco: cliente.endereco || "",
    });
  };

  const handleStarClick = async (clienteId: string, novaClassificacao: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({ classification: novaClassificacao })
        .eq('id', clienteId);
        
      if (error) throw error;
      
      // Update local state for immediate UI update
      const novosClientes = clientes.map(cliente => {
        if (cliente.id === clienteId) {
          return { ...cliente, classificacao: novaClassificacao };
        }
        return cliente;
      });
      setClientes(novosClientes);
    } catch (error) {
      console.error('Error updating classification:', error);
      toast({
        title: "Erro ao atualizar classificação",
        description: "Não foi possível atualizar a classificação do cliente.",
        variant: "destructive",
      });
    }
  };

  const clientesFiltrados = clientes
    .filter(cliente =>
      cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.email.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.telefone.includes(busca)
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const StarRating = ({ value, onChange, readOnly = false }: { value: number, onChange?: (rating: number) => void, readOnly?: boolean }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
              ${!readOnly ? "cursor-pointer" : ""}`}
            onClick={() => !readOnly && onChange && onChange(star)}
          />
        ))}
      </div>
    );
  };

  const isAniversariante = (cliente: Cliente) => {
    if (!cliente.aniversario) return false;
    const hoje = new Date();
    const aniversario = new Date(cliente.aniversario);
    return isSameDay(
      new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
      new Date(hoje.getFullYear(), aniversario.getMonth(), aniversario.getDate())
    );
  };

  const formatWhatsAppNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="space-y-6 animate-fadeIn pt-16">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Gerencie seus clientes</p>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="bg-[#9b87f5] hover:bg-[#7e69ab] mt-4">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-white">
            <SheetHeader>
              <SheetTitle>{editingClient ? "Editar Cliente" : "Adicionar Novo Cliente"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Input
                  placeholder="Nome"
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="Telefone"
                  value={novoCliente.telefone}
                  onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="Email"
                  type="email"
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                />
              </div>
              <div>
                <Input
                  placeholder="Endereço"
                  value={novoCliente.endereco}
                  onChange={(e) => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Aniversário</label>
                <Input
                  type="date"
                  placeholder="Aniversário"
                  value={novoCliente.aniversario}
                  onChange={(e) => setNovoCliente({ ...novoCliente, aniversario: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-gray-600">Classificação</p>
                <StarRating
                  value={novoCliente.classificacao}
                  onChange={(rating) => setNovoCliente({ ...novoCliente, classificacao: rating })}
                />
              </div>
              <Button 
                className="w-full bg-[#9b87f5] hover:bg-[#7e69ab]"
                onClick={handleAdicionarCliente}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </div>
                ) : (
                  <>{editingClient ? "Salvar Alterações" : "Adicionar Cliente"}</>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Buscar clientes..."
          className="pl-10 w-full"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {isLoading && clientes.length === 0 ? (
        <div className="flex justify-center p-8">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum cliente encontrado.</p>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-2">
          {clientesFiltrados.map((cliente) => (
            <AccordionItem 
              key={cliente.id} 
              value={cliente.id} 
              className={`border rounded-lg p-2 ${isAniversariante(cliente) ? 'bg-pink-50 border-pink-200' : ''}`}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="font-semibold flex items-center gap-2">
                      {cliente.nome}
                      {isAniversariante(cliente) && (
                        <Gift className="w-4 h-4 text-pink-500 animate-bounce" />
                      )}
                    </div>
                    <StarRating 
                      value={cliente.classificacao} 
                      onChange={(rating) => handleStarClick(cliente.id, rating)}
                      readOnly={false}
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <AtSign className="w-4 h-4" />
                    <a href={`mailto:${cliente.email}`} className="hover:text-blue-500 transition-colors">
                      {cliente.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    <a 
                      href={`https://wa.me/${formatWhatsAppNumber(cliente.telefone)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-green-500 transition-colors"
                    >
                      {cliente.telefone}
                    </a>
                  </div>
                  {cliente.endereco && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Home className="w-4 h-4 text-blue-400" />
                      {cliente.endereco}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-red-300" />
                    {cliente.aniversario}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarCliente(cliente)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="bg-white">
                        <SheetHeader>
                          <SheetTitle>Editar Cliente</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4 mt-4">
                          <Input
                            placeholder="Nome"
                            value={novoCliente.nome}
                            onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                          />
                          <Input
                            placeholder="Telefone"
                            value={novoCliente.telefone}
                            onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={novoCliente.email}
                            onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                          />
                          <Input
                            placeholder="Endereço"
                            value={novoCliente.endereco}
                            onChange={(e) => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
                          />
                          <label className="block text-sm text-gray-600 mb-1">Aniversário</label>
                          <Input
                            type="date"
                            placeholder="Aniversário"
                            value={novoCliente.aniversario}
                            onChange={(e) => setNovoCliente({ ...novoCliente, aniversario: e.target.value })}
                          />
                          <div>
                            <p className="mb-2 text-sm text-gray-600">Classificação</p>
                            <StarRating
                              value={novoCliente.classificacao}
                              onChange={(rating) => setNovoCliente({ ...novoCliente, classificacao: rating })}
                            />
                          </div>
                          <Button 
                            className="w-full bg-[#9b87f5] hover:bg-[#7e69ab]"
                            onClick={handleAdicionarCliente}
                            disabled={isLoading}
                          >
                            {isLoading ? "Processando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja excluir este cliente? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleExcluirCliente(cliente.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {isLoading ? "Processando..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
