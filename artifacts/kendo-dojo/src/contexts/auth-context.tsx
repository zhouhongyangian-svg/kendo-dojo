import React, { createContext, useContext, useEffect } from "react";
import { useGetMe, getGetMeQueryKey, useLogin, useLogout } from "@workspace/api-client-react";
import type { Member, LoginInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  member: Member | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: member, isLoading: isLoadingMe } = useGetMe({ 
    query: { 
      queryKey: getGetMeQueryKey(),
      retry: false
    } 
  });
  
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (input: LoginInput) => {
    await loginMutation.mutateAsync({ data: input });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    await queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider value={{ member: member ?? null, isLoading: isLoadingMe || loginMutation.isPending || logoutMutation.isPending, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
