import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";

export default function Configuracoes() {
  const { toast } = useToast();
  const { user, signOut, isDarkMode, setIsDarkMode } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleDeleteAccount = async () => {
    setIsValidating(true);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        toast({
          title: "Erro de autenticação",
          description: "Email ou senha incorretos. Por favor, verifique suas credenciais.",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }
      
      setIsValidating(false);
      setIsDeleting(true);
      
      const { error: rpcError } = await supabase.rpc('delete_user');
      
      if (rpcError) throw rpcError;
      
      const { error: edgeFnError } = await supabase.functions.invoke('delete-user', {
        body: { userId: user?.id }
      });
      
      if (edgeFnError) throw edgeFnError;
      
      await signOut();
      
      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir conta",
        description: error.message || "Ocorreu um erro ao excluir sua conta",
        variant: "destructive",
      });
      setIsDeleting(false);
      setIsValidating(false);
    }
  };

  const handleThemeToggle = (value: boolean) => {
    setIsDarkMode(value);
    
    toast({
      title: value ? "Tema escuro ativado" : "Tema claro ativado",
      description: "A aparência do sistema foi alterada",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>
      
      <Tabs defaultValue="aparencia" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
        </TabsList>
        
        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Aparência</CardTitle>
              <CardDescription>Personalize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center gap-2">
                  {isDarkMode ? (
                    <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  )}
                  <Label htmlFor="tema-escuro">Tema Escuro</Label>
                </div>
                <Switch 
                  id="tema-escuro" 
                  checked={isDarkMode}
                  onCheckedChange={handleThemeToggle} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="conta">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Conta</CardTitle>
              <CardDescription>Gerencie suas informações de conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-destructive">Zona de Perigo</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Atenção! As ações abaixo são irreversíveis.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? "Excluindo..." : "Excluir minha conta"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                      e removerá seus dados de nossos servidores.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <div className="space-y-4 py-3">
                    <p className="text-sm font-medium">Para confirmar, digite seu email e senha:</p>
                    <div className="space-y-3">
                      <Input
                        type="email"
                        placeholder="Seu email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isValidating || isDeleting}
                      />
                      
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isValidating || isDeleting}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3"
                          disabled={isValidating || isDeleting}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isValidating || isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAccount();
                      }}
                      disabled={!email || !password || isValidating || isDeleting}
                    >
                      {isValidating ? "Verificando..." : isDeleting ? "Excluindo..." : "Sim, excluir minha conta"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
