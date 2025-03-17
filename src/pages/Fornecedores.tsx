
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, FileEdit, Phone, Mail, MapPin, Search } from "lucide-react";

interface Fornecedor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  products: string;
  created_at?: string;
  owner_id?: string;
}

export default function Fornecedores() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState<Fornecedor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState<Fornecedor>({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    products: ""
  });
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editDialogAberto, setEditDialogAberto] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFornecedores();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFornecedoresFiltrados(fornecedores);
    } else {
      const filtered = fornecedores.filter(
        (fornecedor) =>
          fornecedor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fornecedor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fornecedor.products?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fornecedor.phone?.includes(searchTerm)
      );
      setFornecedoresFiltrados(filtered);
    }
  }, [searchTerm, fornecedores]);

  const fetchFornecedores = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('owner_id', user?.id);
      
      if (error) throw error;
      
      const fornecedoresData = data?.map(supplier => ({
        ...supplier,
        products: supplier.products || ""
      })) || [];
      
      setFornecedores(fornecedoresData);
      setFornecedoresFiltrados(fornecedoresData);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar os fornecedores. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdicionarFornecedor = async () => {
    if (!novoFornecedor.name || !novoFornecedor.email || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fornecedorData = {
        ...novoFornecedor,
        owner_id: user.id
      };
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: fornecedorData.name,
          email: fornecedorData.email,
          phone: fornecedorData.phone,
          address: fornecedorData.address,
          products: fornecedorData.products,
          owner_id: fornecedorData.owner_id
        })
        .select()
        .single();

      if (error) throw error;

      setFornecedores([...fornecedores, data]);
      setNovoFornecedor({
        id: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        products: ""
      });
      setDialogAberto(false);

      toast({
        title: "Fornecedor adicionado",
        description: "O fornecedor foi adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao adicionar fornecedor:', error);
      toast({
        title: "Erro ao adicionar fornecedor",
        description: "Não foi possível adicionar o fornecedor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditarFornecedor = (fornecedor: Fornecedor) => {
    setFornecedorEditando(fornecedor);
    setEditDialogAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!fornecedorEditando || !user) return;

    try {
      const { created_at, owner_id, ...fornecedorData } = fornecedorEditando;
      
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: fornecedorData.name,
          email: fornecedorData.email,
          phone: fornecedorData.phone,
          address: fornecedorData.address,
          products: fornecedorData.products
        })
        .eq('id', fornecedorEditando.id)
        .eq('owner_id', user.id);

      if (error) throw error;

      setFornecedores(fornecedores.map(f => 
        f.id === fornecedorEditando.id ? fornecedorEditando : f
      ));
      setFornecedorEditando(null);
      setEditDialogAberto(false);

      toast({
        title: "Fornecedor atualizado",
        description: "As informações do fornecedor foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      toast({
        title: "Erro ao atualizar fornecedor",
        description: "Não foi possível atualizar o fornecedor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleExcluirFornecedor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setFornecedores(fornecedores.filter(f => f.id !== id));
      toast({
        title: "Sucesso",
        description: "Fornecedor excluído com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o fornecedor.",
        variant: "destructive"
      });
    }
  };

  const formatarTelefoneParaWhatsApp = (telefone: string) => {
    const numeroLimpo = telefone.replace(/\D/g, '');
    let numeroFormatado = numeroLimpo;
    if (!numeroLimpo.startsWith('55') && numeroLimpo.length > 8) {
      numeroFormatado = `55${numeroLimpo}`;
    }
    return `https://wa.me/${numeroFormatado}`;
  };

  const formatarEmailParaMailto = (email: string) => {
    return `mailto:${email}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto gap-3">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              className="pl-10"
              placeholder="Buscar fornecedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button className="bg-[#9b87f5] hover:bg-[#7e69ab] w-full md:w-auto whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Preencha os dados do fornecedor abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="nome" className="text-sm font-medium">Nome*</label>
                  <Input
                    id="nome"
                    value={novoFornecedor.name}
                    onChange={(e) => setNovoFornecedor({...novoFornecedor, name: e.target.value})}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email*</label>
                  <Input
                    id="email"
                    type="email"
                    value={novoFornecedor.email}
                    onChange={(e) => setNovoFornecedor({...novoFornecedor, email: e.target.value})}
                    placeholder="Email do fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="telefone" className="text-sm font-medium">Telefone</label>
                  <Input
                    id="telefone"
                    value={novoFornecedor.phone}
                    onChange={(e) => setNovoFornecedor({...novoFornecedor, phone: e.target.value})}
                    placeholder="Telefone do fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="endereco" className="text-sm font-medium">Endereço</label>
                  <Input
                    id="endereco"
                    value={novoFornecedor.address}
                    onChange={(e) => setNovoFornecedor({...novoFornecedor, address: e.target.value})}
                    placeholder="Endereço do fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="produtos" className="text-sm font-medium">Produtos</label>
                  <Textarea
                    id="produtos"
                    value={novoFornecedor.products}
                    onChange={(e) => setNovoFornecedor({...novoFornecedor, products: e.target.value})}
                    placeholder="Produtos fornecidos"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button className="bg-[#9b87f5] hover:bg-[#7e69ab]" onClick={handleAdicionarFornecedor}>
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b87f5]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fornecedoresFiltrados.length === 0 ? (
            <Card className="p-8 text-center col-span-full">
              <h3 className="text-lg font-medium text-gray-500">
                {searchTerm ? "Nenhum fornecedor encontrado para essa busca" : "Nenhum fornecedor encontrado"}
              </h3>
              <p className="text-gray-400 mt-2">
                {searchTerm ? "Tente outros termos de busca" : "Adicione fornecedores para começar"}
              </p>
            </Card>
          ) : (
            fornecedoresFiltrados.map((fornecedor) => (
              <Card key={fornecedor.id} className="p-6 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditarFornecedor(fornecedor)}
                  >
                    <FileEdit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleExcluirFornecedor(fornecedor.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <h3 className="text-xl font-semibold mb-3">{fornecedor.name}</h3>
                <div className="space-y-2 mt-4">
                  {fornecedor.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a 
                        href={formatarEmailParaMailto(fornecedor.email)} 
                        className="text-gray-600 hover:text-blue-500 transition-colors"
                      >
                        {fornecedor.email}
                      </a>
                    </p>
                  )}
                  {fornecedor.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> 
                      <a 
                        href={formatarTelefoneParaWhatsApp(fornecedor.phone)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-gray-600 hover:text-green-500 transition-colors"
                      >
                        {fornecedor.phone}
                      </a>
                    </p>
                  )}
                  {fornecedor.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {fornecedor.address}
                    </p>
                  )}
                  {fornecedor.products && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      <strong>Produtos:</strong> {fornecedor.products}
                    </p>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={editDialogAberto} onOpenChange={setEditDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Atualize os dados do fornecedor abaixo.
            </DialogDescription>
          </DialogHeader>
          {fornecedorEditando && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="nome" className="text-sm font-medium">Nome*</label>
                <Input
                  id="nome"
                  value={fornecedorEditando.name}
                  onChange={(e) => setFornecedorEditando({...fornecedorEditando, name: e.target.value})}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email*</label>
                <Input
                  id="email"
                  type="email"
                  value={fornecedorEditando.email}
                  onChange={(e) => setFornecedorEditando({...fornecedorEditando, email: e.target.value})}
                  placeholder="Email do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="telefone" className="text-sm font-medium">Telefone</label>
                <Input
                  id="telefone"
                  value={fornecedorEditando.phone}
                  onChange={(e) => setFornecedorEditando({...fornecedorEditando, phone: e.target.value})}
                  placeholder="Telefone do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="endereco" className="text-sm font-medium">Endereço</label>
                <Input
                  id="endereco"
                  value={fornecedorEditando.address}
                  onChange={(e) => setFornecedorEditando({...fornecedorEditando, address: e.target.value})}
                  placeholder="Endereço do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="produtos" className="text-sm font-medium">Produtos</label>
                <Textarea
                  id="produtos"
                  value={fornecedorEditando.products}
                  onChange={(e) => setFornecedorEditando({...fornecedorEditando, products: e.target.value})}
                  placeholder="Produtos fornecidos"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogAberto(false)}>Cancelar</Button>
            <Button className="bg-[#9b87f5] hover:bg-[#7e69ab]" onClick={handleSalvarEdicao}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
