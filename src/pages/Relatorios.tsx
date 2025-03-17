
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Users, DollarSign, Truck, CheckSquare, Package } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Venda {
  id: string;
  valor: number;
  data: string;
  arquivada?: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  aniversario: string;
  classificacao: number;
}

interface Fornecedor {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  produtos: string;
}

interface Produto {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  supplier?: string;
}

interface Tarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  dataVencimento: string;
}

export default function Relatorios() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para formatar datas no formato brasileiro
  const formatarData = (dataISO: string) => {
    try {
      if (!dataISO) return "Data não informada";
      const data = parseISO(dataISO);
      return format(data, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dataISO;
    }
  };

  const gerarRelatorioVendas = () => {
    const vendas: Venda[] = JSON.parse(localStorage.getItem('vendas') || '[]');
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Vendas", 14, 15);
    doc.setFont("helvetica", "normal");
    
    const vendasAtivas = vendas.filter(v => !v.arquivada);
    const totalVendas = vendasAtivas.reduce((acc, v) => acc + v.valor, 0);
    
    const dados = vendasAtivas.map(venda => [
      format(parseISO(venda.data), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      venda.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      venda.arquivada ? "Sim" : "Não"
    ]);

    let finalY = 25;

    autoTable(doc, {
      head: [["Data", "Valor", "Arquivada"]],
      body: dados,
      startY: 25,
      didDrawPage: function(data) {
        finalY = data.cursor.y;
      }
    });

    doc.text(
      `Total de Vendas: ${totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      14,
      finalY + 10
    );
    
    doc.save('relatorio-vendas.pdf');
  };

  const gerarRelatorioVendasDiarias = () => {
    const vendas: Venda[] = JSON.parse(localStorage.getItem('vendas') || '[]');
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Vendas do Dia", 14, 15);
    doc.setFont("helvetica", "normal");
    
    const hoje = new Date();
    const vendasHoje = vendas.filter(venda => {
      const dataVenda = parseISO(venda.data);
      return (
        dataVenda.getDate() === hoje.getDate() &&
        dataVenda.getMonth() === hoje.getMonth() &&
        dataVenda.getFullYear() === hoje.getFullYear()
      );
    });
    
    const totalVendasDia = vendasHoje.reduce((acc, v) => acc + v.valor, 0);
    
    const dados = vendasHoje.map(venda => [
      format(parseISO(venda.data), "HH:mm", { locale: ptBR }),
      venda.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);

    let finalY = 25;

    autoTable(doc, {
      head: [["Hora", "Valor"]],
      body: dados,
      startY: 25,
      didDrawPage: function(data) {
        finalY = data.cursor.y;
      }
    });

    doc.text(
      `Total de Vendas do Dia: ${totalVendasDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      14,
      finalY + 10
    );
    
    doc.save('relatorio-vendas-diarias.pdf');
  };

  const gerarRelatorioEstoque = () => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Estoque", 14, 15);
    doc.setFont("helvetica", "normal");
    
    const dados = produtos.map(produto => [
      produto.name,
      produto.quantity.toString(),
      produto.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      produto.supplier || 'N/A'
    ]);

    let finalY = 25;

    autoTable(doc, {
      head: [["Produto", "Quantidade", "Preço", "Fornecedor"]],
      body: dados,
      startY: 25,
      theme: 'striped',
      headStyles: { fillColor: [155, 135, 245] },
      styles: {
        cellPadding: 3,
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 60 }
      },
      didDrawPage: function(data) {
        finalY = data.cursor.y;
      }
    });

    const valorTotalEstoque = produtos.reduce((total, produto) => 
      total + (produto.unit_price * produto.quantity), 0
    );

    doc.text(
      `Valor Total em Estoque: ${valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      14,
      finalY + 10
    );

    const dataHora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Relatório gerado em: ${dataHora}`, 14, finalY + 20);
    
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`relatorio-estoque-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  };

  const gerarRelatorioClientes = () => {
    const clientes: Cliente[] = JSON.parse(localStorage.getItem('clientes') || '[]');
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Clientes", 14, 15);
    doc.setFont("helvetica", "normal");
    
    const dados = clientes.map(cliente => [
      cliente.nome,
      cliente.telefone,
      cliente.email,
      formatarData(cliente.aniversario),
      "⭐".repeat(cliente.classificacao)
    ]);

    autoTable(doc, {
      head: [["Nome", "Telefone", "Email", "Aniversário", "Classificação"]],
      body: dados,
      startY: 25,
    });
    
    doc.save('relatorio-clientes.pdf');
  };

  const gerarRelatorioFornecedores = () => {
    const fornecedores: Fornecedor[] = JSON.parse(localStorage.getItem('fornecedores') || '[]');
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Fornecedores", 14, 15);
    doc.setFont("helvetica", "normal");
    
    const dados = fornecedores.map(fornecedor => [
      fornecedor.nome,
      fornecedor.telefone,
      fornecedor.email,
      fornecedor.endereco,
      fornecedor.produtos
    ]);

    autoTable(doc, {
      head: [["Nome", "Telefone", "Email", "Endereço", "Produtos"]],
      body: dados,
      startY: 25,
    });
    
    doc.save('relatorio-fornecedores.pdf');
  };

  const gerarRelatorioTarefas = () => {
    const tarefas: Tarefa[] = JSON.parse(localStorage.getItem('tarefas') || '[]');
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Tarefas", 14, 15);
    doc.setFont("helvetica", "normal");
    
    const dados = tarefas.map(tarefa => [
      tarefa.titulo,
      format(new Date(tarefa.dataVencimento), "dd/MM/yyyy", { locale: ptBR }),
      tarefa.concluida ? "Concluída" : "Pendente"
    ]);

    autoTable(doc, {
      head: [["Título", "Data de Vencimento", "Status"]],
      body: dados,
      startY: 25,
    });
    
    doc.save('relatorio-tarefas.pdf');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Relatórios</h1>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Relatórios</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            variant="outline"
            className="flex items-center justify-start gap-2 h-auto py-4"
            onClick={gerarRelatorioVendas}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#9b87f5]" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Relatório de Vendas</div>
              <div className="text-sm text-gray-500">Exportar histórico de vendas</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-2 h-auto py-4"
            onClick={gerarRelatorioVendasDiarias}
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Relatório de Vendas do Dia</div>
              <div className="text-sm text-gray-500">Exportar vendas de hoje</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-2 h-auto py-4"
            onClick={gerarRelatorioClientes}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Relatório de Clientes</div>
              <div className="text-sm text-gray-500">Exportar lista de clientes</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-2 h-auto py-4"
            onClick={gerarRelatorioFornecedores}
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Relatório de Fornecedores</div>
              <div className="text-sm text-gray-500">Exportar lista de fornecedores</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-2 h-auto py-4"
            onClick={gerarRelatorioTarefas}
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Relatório de Tarefas</div>
              <div className="text-sm text-gray-500">Exportar lista de tarefas</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-2 h-auto py-4"
            onClick={gerarRelatorioEstoque}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Relatório de Estoque</div>
              <div className="text-sm text-gray-500">Exportar situação do estoque</div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
}
