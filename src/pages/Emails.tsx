
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Import React-Quill for WYSIWYG editor
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Cliente {
  id: string;
  nome: string;
  email: string;
}

interface EmailHistoryItem {
  id: string;
  assunto: string;
  destinatarios: number;
  data: string;
  status: 'enviado' | 'falha';
}

export default function Emails() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [fromName, setFromName] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryItem[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchClientes();
      fetchEmailHistory();
      // Set sender name if not already defined
      if (!fromName) {
        setFromName(user.user_metadata?.name || "Minha Loja");
      }
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchClientes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('owner_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const clientesFormatados = data
        .filter(cliente => cliente.email) // Filter only clients with email
        .map(cliente => ({
          id: cliente.id,
          nome: cliente.name,
          email: cliente.email || ''
        }));

      setClientes(clientesFormatados);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmailHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const history = data.map(item => ({
        id: item.id,
        assunto: item.subject,
        destinatarios: item.recipient_count,
        data: item.created_at,
        status: item.status as 'enviado' | 'falha',
      }));

      setEmailHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico de emails:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClientes([]);
    } else {
      setSelectedClientes(clientes.map(cliente => cliente.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectCliente = (id: string) => {
    if (selectedClientes.includes(id)) {
      setSelectedClientes(selectedClientes.filter(clienteId => clienteId !== id));
      setSelectAll(false);
    } else {
      setSelectedClientes([...selectedClientes, id]);
      if (selectedClientes.length + 1 === clientes.length) {
        setSelectAll(true);
      }
    }
  };

  const handleEnviarEmail = async () => {
    if (!fromName || !assunto || !conteudo || selectedClientes.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione pelo menos um cliente.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const clientesSelecionados = clientes.filter(cliente => 
        selectedClientes.includes(cliente.id)
      );
      
      // Call Supabase Edge Function to send emails
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          from: {
            email: user?.email || "",
            name: fromName
          },
          subject: assunto,
          content: conteudo,
          recipients: clientesSelecionados.map(cliente => ({
            email: cliente.email,
            name: cliente.nome
          }))
        }
      });
      
      if (error) throw error;
      
      // Record email history in database
      const { error: historyError } = await supabase
        .from('email_history')
        .insert({
          owner_id: user?.id,
          subject: assunto,
          recipient_count: clientesSelecionados.length,
          status: 'enviado',
          content: conteudo
        });
      
      if (historyError) console.error('Erro ao registrar histórico:', historyError);

      // Refresh email history
      await fetchEmailHistory();
      
      toast({
        title: "E-mails enviados com sucesso",
        description: `Foram enviados e-mails para ${clientesSelecionados.length} clientes.`,
      });
      
      // Reset form after sending
      setAssunto("");
      setConteudo("");
    } catch (error) {
      console.error('Erro ao enviar e-mails:', error);
      toast({
        title: "Erro ao enviar e-mails",
        description: "Ocorreu um erro ao tentar enviar os e-mails. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, 
       {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }]
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image',
    'color', 'background', 'font', 'align'
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">E-mails</h1>
          <p className="text-muted-foreground">
            Envie e-mails para seus clientes
          </p>
        </div>
      </div>

      <Tabs defaultValue="enviar" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2">
          <TabsTrigger value="enviar">Enviar E-mail</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="space-y-4 mt-4">
          <Card className="p-6">
            <div className="grid gap-6">
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromName">Nome do Remetente</Label>
                    <Input 
                      id="fromName" 
                      placeholder="Sua Loja" 
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Seu e-mail de remetente: <strong>{user?.email}</strong>
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input 
                    id="assunto" 
                    placeholder="Digite o assunto do e-mail" 
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <div className="min-h-[300px] border rounded-md">
                    <ReactQuill 
                      theme="snow" 
                      value={conteudo} 
                      onChange={setConteudo}
                      modules={modules}
                      formats={formats}
                      placeholder="Escreva o conteúdo do e-mail..."
                      className="h-[250px] mb-12"
                    />
                  </div>
                </div>
                <div className="space-y-4 mt-10 pt-6 border-t">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <h3 className="text-lg font-medium mb-3 md:mb-0">Destinatários</h3>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox 
                        id="selectAll" 
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="selectAll" className="cursor-pointer">Selecionar todos</Label>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : clientes.length > 0 ? (
                    <div className="border rounded-md max-h-[300px] overflow-y-auto p-4">
                      <div className="space-y-3">
                        {clientes.map((cliente) => (
                          <div key={cliente.id} className="flex items-center space-x-3 border-b pb-3 mb-3">
                            <Checkbox 
                              id={`cliente-${cliente.id}`} 
                              checked={selectedClientes.includes(cliente.id)}
                              onCheckedChange={() => handleSelectCliente(cliente.id)}
                            />
                            <Label 
                              htmlFor={`cliente-${cliente.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{cliente.nome}</span>
                                <span className="text-sm text-muted-foreground">{cliente.email}</span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border rounded-md">
                      <Mail className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Nenhum cliente com e-mail cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleEnviarEmail} 
                disabled={isLoading || isSending || selectedClientes.length === 0}
                className="w-full md:w-auto ml-auto"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar E-mail
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="p-6">
            {emailHistory.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Histórico de E-mails Enviados</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assunto</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Destinatários</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {emailHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.assunto}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.destinatarios}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === 'enviado' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {item.status === 'enviado' ? 'Enviado' : 'Falha'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">Histórico de E-mails</h3>
                <p className="text-muted-foreground">
                  Nenhum e-mail enviado até o momento
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
