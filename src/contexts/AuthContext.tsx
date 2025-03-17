
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserPreferences = {
  recentViews?: string[];
  lastVisitedPage?: string;
  favoriteItems?: string[];
  customizations?: Record<string, unknown>;
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  setUser: (user: User | null) => void;
  userPreferences: UserPreferences;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  addRecentView: (itemId: string) => void;
  addFavoriteItem: (itemId: string) => void;
  removeFavoriteItem: (itemId: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isDarkMode: false,
  setIsDarkMode: () => {},
  setUser: () => {},
  userPreferences: {},
  updateUserPreferences: () => {},
  addRecentView: () => {},
  addFavoriteItem: () => {},
  removeFavoriteItem: () => {},
});

// Funções auxiliares para lidar com localStorage
const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Erro ao salvar no localStorage:", error);
  }
};

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error("Erro ao ler do localStorage:", error);
    return defaultValue;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    recentViews: [],
    favoriteItems: [],
    customizations: {},
  });

  // Carregar preferências do usuário
  useEffect(() => {
    if (user) {
      const userId = user.id;
      const storedPreferences = getFromLocalStorage<UserPreferences>(
        `user_preferences_${userId}`,
        {
          recentViews: [],
          favoriteItems: [],
          customizations: {},
        }
      );
      setUserPreferences(storedPreferences);
    }
  }, [user]);

  useEffect(() => {
    // Check if dark mode is active in localStorage or in system preferences
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldUseDarkMode);
    
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    // Check current session on page load
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Registrar última visita
        if (session?.user) {
          const now = new Date().toISOString();
          const userId = session.user.id;
          localStorage.setItem(`last_login_${userId}`, now);
          
          // Atualizar preferências com a última página visitada
          const currentPath = window.location.pathname;
          updateUserPreferences({ lastVisitedPage: currentPath });
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Detectar mudanças de página para rastrear navegação do usuário
    const handleRouteChange = () => {
      if (user) {
        const currentPath = window.location.pathname;
        updateUserPreferences({ lastVisitedPage: currentPath });
      }
    };

    window.addEventListener('popstate', handleRouteChange);

    // Clean up subscriptions when component is unmounted
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Não limpar preferências no logout, mas poderia limpar dados sensíveis
      // específicos aqui se necessário
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSetIsDarkMode = (value: boolean) => {
    setIsDarkMode(value);
    
    if (value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const updateUserPreferences = (preferences: Partial<UserPreferences>) => {
    if (!user) return;
    
    const updatedPreferences = {
      ...userPreferences,
      ...preferences
    };
    
    setUserPreferences(updatedPreferences);
    saveToLocalStorage(`user_preferences_${user.id}`, updatedPreferences);
  };

  const addRecentView = (itemId: string) => {
    if (!user) return;
    
    const currentViews = userPreferences.recentViews || [];
    // Remover duplicatas e limitar a 10 itens
    const updatedViews = [itemId, ...currentViews.filter(id => id !== itemId)].slice(0, 10);
    
    updateUserPreferences({
      recentViews: updatedViews
    });
  };

  const addFavoriteItem = (itemId: string) => {
    if (!user) return;
    
    const currentFavorites = userPreferences.favoriteItems || [];
    if (!currentFavorites.includes(itemId)) {
      updateUserPreferences({
        favoriteItems: [...currentFavorites, itemId]
      });
    }
  };

  const removeFavoriteItem = (itemId: string) => {
    if (!user) return;
    
    const currentFavorites = userPreferences.favoriteItems || [];
    updateUserPreferences({
      favoriteItems: currentFavorites.filter(id => id !== itemId)
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut, 
      isDarkMode, 
      setIsDarkMode: handleSetIsDarkMode,
      setUser,
      userPreferences,
      updateUserPreferences,
      addRecentView,
      addFavoriteItem,
      removeFavoriteItem
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
