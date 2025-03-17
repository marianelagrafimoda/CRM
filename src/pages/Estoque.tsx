
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, Edit, Trash2, Plus, MinusIcon, PlusIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Produto {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  supplier?: string;
}

export default function Estoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [novoProduto, setNovoProduto] = useState({
    name: "",
    quantity: "",
    unit_price: "",
    supplier: ""
  });
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive"
      });
    }
  };

  const handleAdicionarProduto = async () => {
    if (!novoProduto.name || !novoProduto.quantity || !novoProduto.unit_price) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: novoProduto.name,
          quantity: Number(novoProduto.quantity),
          unit_price: Number(novoProduto.unit_price),
          supplier: novoProduto.supplier || null
        }])
        .select()
        .single();

      if (error) throw error;

      setProdutos([...produtos, data]);
      setNovoProduto({
        name: "",
        quantity: "",
        unit_price: "",
        supplier: ""
      });

      toast({
        title: "Sucesso",
        description: "Produto adicionado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o produto.",
        variant: "destructive"
      });
    }
  };

  const handleExcluirProduto = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProdutos(produtos.filter(p => p.id !== id));
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto.",
        variant: "destructive"
      });
    }
  };

  const handleSalvarEdicao = async () => {
    if (!produtoEditando) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: produtoEditando.name,
          quantity: produtoEditando.quantity,
          unit_price: produtoEditando.unit_price,
          supplier: produtoEditando.supplier
        })
        .eq('id', produtoEditando.id);

      if (error) throw error;

      setProdutos(produtos.map(p => 
        p.id === produtoEditando.id ? produtoEditando : p
      ));
      setProdutoEditando(null);
      
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive"
      });
    }
  };

  const handleQuantidadeChange = async (id: string, delta: number) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const novaQuantidade = Math.max(0, produto.quantity + delta);

    try {
      const { error } = await supabase
        .from('products')
        .update({ quantity: novaQuantidade })
        .eq('id', id);

      if (error) throw error;

      setProdutos(produtos.map(p => 
        p.id === id ? { ...p, quantity: novaQuantidade } : p
      ));
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a quantidade.",
        variant: "destructive"
      });
    }
  };

  const produtosFiltrados = produtos.filter(produto =>
    produto.name.toLowerCase().includes(busca.toLowerCase())
  );

  const valorTotal = produtosFiltrados.reduce(
    (total, produto) => total + (produto.quantity * produto.unit_price),
    0
  );

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Controle de Estoque</h1>
        <p className="text-muted-foreground">
          Gerencie seus produtos e estoque
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Novo Produto</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Nome do produto"
              value={novoProduto.name}
              onChange={(e) => setNovoProduto({ ...novoProduto, name: e.target.value })}
            />
            <Input
              placeholder="Quantidade"
              type="number"
              min="0"
              value={novoProduto.quantity}
              onChange={(e) => setNovoProduto({ ...novoProduto, quantity: e.target.value })}
            />
            <Input
              placeholder="Valor unitário"
              type="number"
              min="0"
              step="0.01"
              value={novoProduto.unit_price}
              onChange={(e) => setNovoProduto({ ...novoProduto, unit_price: e.target.value })}
            />
            <Input
              placeholder="Fornecedor (opcional)"
              value={novoProduto.supplier || ''}
              onChange={(e) => setNovoProduto({ ...novoProduto, supplier: e.target.value })}
            />
          </div>
          <Button 
            className="bg-[#9b87f5] hover:bg-[#7e69ab] w-full md:w-auto"
            onClick={handleAdicionarProduto}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar produtos..."
            className="pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="text-lg font-semibold">
          Valor Total: {formatarMoeda(valorTotal)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {produtosFiltrados.map((produto) => (
          <Card key={produto.id} className="p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{produto.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Valor: {formatarMoeda(produto.unit_price)}
                  </p>
                  {produto.supplier && (
                    <p className="text-sm text-muted-foreground">
                      Fornecedor: {produto.supplier}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setProdutoEditando(produto)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Editar Produto</SheetTitle>
                      </SheetHeader>
                      {produtoEditando && (
                        <div className="space-y-4 mt-4">
                          <Input
                            placeholder="Nome do produto"
                            value={produtoEditando.name}
                            onChange={e => setProdutoEditando({
                              ...produtoEditando,
                              name: e.target.value
                            })}
                          />
                          <Input
                            placeholder="Quantidade"
                            type="number"
                            min="0"
                            value={produtoEditando.quantity}
                            onChange={e => setProdutoEditando({
                              ...produtoEditando,
                              quantity: Number(e.target.value)
                            })}
                          />
                          <Input
                            placeholder="Valor unitário"
                            type="number"
                            min="0"
                            step="0.01"
                            value={produtoEditando.unit_price}
                            onChange={e => setProdutoEditando({
                              ...produtoEditando,
                              unit_price: Number(e.target.value)
                            })}
                          />
                          <Input
                            placeholder="Fornecedor (opcional)"
                            value={produtoEditando.supplier || ''}
                            onChange={e => setProdutoEditando({
                              ...produtoEditando,
                              supplier: e.target.value
                            })}
                          />
                          <Button onClick={handleSalvarEdicao} className="w-full">
                            Salvar Alterações
                          </Button>
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExcluirProduto(produto.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-2">
                <p className="text-sm">Total: {formatarMoeda(produto.quantity * produto.unit_price)}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantidadeChange(produto.id, -1)}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{produto.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantidadeChange(produto.id, 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
