import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  document: z.string().min(11, "Documento inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type SignupFormData = {
  fullName: string;
  email: string;
  document: string;
  documentType: string;
  password: string;
  affiliateCode?: string;
};

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
      navigate("/preloader");
    } catch (error: any) {
      const errorMessage = error.message === "Invalid login credentials" 
        ? "Credenciais de login inválidas" 
        : error.message;
      
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (formData: SignupFormData, allowRegistration: boolean) => {
    if (!allowRegistration) {
      toast({
        title: "Cadastro desativado",
        description: "O registro de novos usuários está temporariamente desativado",
        variant: "destructive",
      });
      return false;
    }

    try {
      signupSchema.parse(formData);
    } catch (error: any) {
      toast({
        title: "Erro de validação",
        description: error.errors[0]?.message || "Dados inválidos",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            document: formData.document,
            document_type: formData.documentType,
            affiliate_code: formData.affiliateCode,
          },
          emailRedirectTo: `${window.location.origin}/preloader`,
        },
      });

      if (error) throw error;

      // If there's an affiliate code, create referral
      if (formData.affiliateCode && data.user) {
        try {
          const { error: referralError } = await supabase.functions.invoke(
            "create-referral",
            {
              body: {
                userId: data.user.id,
                affiliateCode: formData.affiliateCode,
              },
            }
          );

          if (referralError) {
            console.error("Error creating referral:", referralError);
            // Don't block signup if referral creation fails
          }
        } catch (referralError) {
          console.error("Error invoking create-referral:", referralError);
          // Don't block signup if referral creation fails
        }
      }

      toast({
        title: "Cadastro realizado!",
        description: formData.affiliateCode 
          ? "Você foi cadastrado via link de afiliado. Já pode fazer login!"
          : "Você já pode fazer login na plataforma.",
      });
      return true;
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Traduzir mensagens comuns do Supabase
      if (error.message.includes("User already registered")) {
        errorMessage = "Usuário já cadastrado";
      } else if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = "Limite de tentativas excedido. Tente novamente mais tarde.";
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/preloader`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Traduzir mensagens comuns de erro
      if (error.message.includes("popup")) {
        errorMessage = "Erro ao abrir janela de login. Verifique se pop-ups estão habilitados.";
      }
      
      toast({
        title: "Erro no login social",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return {
    isLoading,
    handleLogin,
    handleSignup,
    handleSocialLogin,
  };
}
