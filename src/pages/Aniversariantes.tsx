import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, MessageSquare, SortAsc, SortDesc, Calendar } from "lucide-react";
import { format, isSameDay, parseISO, isValid, isSameMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  aniversario: string;
}

export default function Aniversariantes() {
  const [aniversariantes, setAniversariantes] = useState<Cliente[]>([]);
  const [aniversariantesMes, setAniversariantesMes] = useState<Cliente[]>([]);
  const [ordenacao, setOrdenacao] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("hoje");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const carregarAniversariantes = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch customers from Supabase
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, email, birthday')
          .eq('owner_id', user.id);
          
        if (error) throw error;
        
        // Filter birthday matches for today
        const hoje = new Date();
        const aniversariantesHoje = data
          .filter(cliente => {
            if (!cliente.birthday) return false;
            
            try {
              const aniversario = parseISO(cliente.birthday);
              if (!isValid(aniversario)) return false;
              
              return isSameDay(
                new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
                new Date(hoje.getFullYear(), aniversario.getMonth(), aniversario.getDate())
              );
            } catch (error) {
              console.error("Erro ao processar data de aniversário:", error);
              return false;
            }
          })
          .map(cliente => ({
            id: cliente.id,
            nome: cliente.name,
            telefone: cliente.phone || '',
            email: cliente.email || '',
            aniversario: cliente.birthday || ''
          }));
        
        // Filter birthday matches for this month
        const aniversariantesMes = data
          .filter(cliente => {
            if (!cliente.birthday) return false;
            
            try {
              const aniversario = parseISO(cliente.birthday);
              if (!isValid(aniversario)) return false;
              
              // Same month as today but not same day (already in the other list)
              return isSameMonth(aniversario, hoje) && 
                !isSameDay(
                  new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
                  new Date(hoje.getFullYear(), aniversario.getMonth(), aniversario.getDate())
                );
            } catch (error) {
              console.error("Erro ao processar data de aniversário:", error);
              return false;
            }
          })
          .map(cliente => ({
            id: cliente.id,
            nome: cliente.name,
            telefone: cliente.phone || '',
            email: cliente.email || '',
            aniversario: cliente.birthday || ''
          }));

        // Sort both lists
        const sortFunction = (a: Cliente, b: Cliente) => {
          // Sort based on day of month
          const dayA = parseISO(a.aniversario).getDate();
          const dayB = parseISO(b.aniversario).getDate();
          
          if (ordenacao === 'asc') {
            return dayA - dayB;
          } else {
            return dayB - dayA;
          }
        };
        
        const aniversariantesHojeOrdenados = [...aniversariantesHoje].sort((a, b) => {
          if (ordenacao === 'asc') {
            return a.nome.localeCompare(b.nome, 'pt-BR');
          } else {
            return b.nome.localeCompare(a.nome, 'pt-BR');
          }
        });
        
        const aniversariantesMesOrdenados = [...aniversariantesMes].sort(sortFunction);
        
        setAniversariantes(aniversariantesHojeOrdenados);
        setAniversariantesMes(aniversariantesMesOrdenados);
      } catch (error) {
        console.error('Error fetching aniversariantes:', error);
        toast({
          title: "Erro ao carregar aniversariantes",
          description: "Não foi possível carregar os aniversariantes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    carregarAniversariantes();

    // Set up a real-time subscription for live updates
    const channel = supabase
      .channel('public:customers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers', filter: `owner_id=eq.${user?.id}` },
        payload => {
          carregarAniversariantes();
        }
      )
      .subscribe();
    
    // Check aniversariantes periodically (hourly)
    const intervalId = setInterval(carregarAniversariantes, 3600000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [user, ordenacao, toast]);

  const formatarData = (dataString: string) => {
    try {
      const data = parseISO(dataString);
      if (!isValid(data)) return "Data inválida";
      
      return format(data, "dd 'de' MMMM", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  const enviarMensagemWhatsApp = (telefone: string, nome: string) => {
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const mensagem = `Feliz aniversário, ${nome}! 🎉`;
    const url = `https://wa.me/55${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    toast({
      title: "Mensagem preparada",
      description: "WhatsApp foi aberto com a mensagem de parabéns!",
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Aniversariantes</h1>
          <p className="text-muted-foreground">Celebre com seus clientes!</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setOrdenacao(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            {ordenacao === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            Ordenar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hoje" onValueChange={setCurrentTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="hoje" className="flex-1 relative">
            Hoje
            {aniversariantes.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />
            )}
          </TabsTrigger>
          <TabsTrigger value="mes" className="flex-1">Este Mês</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : aniversariantes.length > 0 ? (
            <div className="grid gap-4">
              {aniversariantes.map((aniversariante) => (
                <Card key={aniversariante.id} className="p-4 md:p-6 border-l-4 border-l-pink-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center animate-bounce shrink-0">
                        <Gift className="w-6 h-6 text-pink-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{aniversariante.nome}</h3>
                        <p className="text-sm font-bold text-pink-500">HOJE!🎉</p>
                        {aniversariante.telefone && (
                          <p className="text-sm text-gray-500 break-words">{aniversariante.telefone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => enviarMensagemWhatsApp(aniversariante.telefone, aniversariante.nome)}
                        className="text-pink-500 border-pink-200 hover:bg-pink-50 w-full sm:w-auto"
                        disabled={!aniversariante.telefone}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/clientes?id=${aniversariante.id}`)}
                        className="text-blue-500 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                      >
                        Ver Perfil
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <div className="text-center text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum aniversariante hoje!</p>
                <p className="text-sm mt-2">Os clientes que fazem aniversário hoje aparecerão aqui.</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mes" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : aniversariantesMes.length > 0 ? (
            <div className="grid gap-4">
              {aniversariantesMes.map((aniversariante) => (
                <Card key={aniversariante.id} className="p-4 md:p-6 border-l-4 border-l-blue-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{aniversariante.nome}</h3>
                        <p className="text-sm font-medium text-blue-500">
                          {formatarData(aniversariante.aniversario)}
                        </p>
                        {aniversariante.telefone && (
                          <p className="text-sm text-gray-500 break-words">{aniversariante.telefone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => enviarMensagemWhatsApp(aniversariante.telefone, aniversariante.nome)}
                        className="text-blue-500 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                        disabled={!aniversariante.telefone}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/clientes?id=${aniversariante.id}`)}
                        className="text-blue-500 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                      >
                        Ver Perfil
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum aniversariante este mês!</p>
                <p className="text-sm mt-2">Os clientes que fazem aniversário neste mês aparecerão aqui.</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
