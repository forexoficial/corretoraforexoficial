import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  document: z.string().min(1, "Documento inválido"), // Allow "N/A" for international users
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type SignupFormData = {
  fullName: string;
  email: string;
  phone: string;
  document: string;
  documentType: string;
  password: string;
  affiliateCode?: string;
  // Country detection fields
  countryCode?: string;
  countryName?: string;
  preferredCurrency?: string;
};

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
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
        title: t("login_success", "Login successful!"),
        description: t("welcome_back", "Welcome back!"),
      });
      navigate("/preloader");
    } catch (error: any) {
      const errorMessage = error.message === "Invalid login credentials" 
        ? t("invalid_credentials", "Invalid login credentials") 
        : error.message;
      
      toast({
        title: t("login_error", "Login error"),
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
        title: t("registration_disabled", "Registration disabled"),
        description: t("registration_disabled_desc", "New user registration is temporarily disabled"),
        variant: "destructive",
      });
      return false;
    }

    try {
      signupSchema.parse(formData);
    } catch (error: any) {
      toast({
        title: t("validation_error", "Validation error"),
        description: error.errors[0]?.message || t("invalid_data", "Invalid data"),
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
            phone: formData.phone,
            document: formData.document,
            document_type: formData.documentType,
            affiliate_code: formData.affiliateCode,
            // Country detection data
            country_code: formData.countryCode || 'XX',
            country_name: formData.countryName || 'Unknown',
            preferred_currency: formData.preferredCurrency || 'USD',
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
        title: t("signup_success", "Registration complete!"),
        description: t("signup_success_desc", "You can now login to the platform."),
      });
      return true;
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Translate common Supabase messages
      if (error.message.includes("User already registered")) {
        errorMessage = t("user_already_registered", "User already registered");
      } else if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = t("rate_limit_exceeded", "Rate limit exceeded. Please try again later.");
      }
      
      toast({
        title: t("signup_error", "Registration error"),
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
      
      // Translate common error messages
      if (error.message.includes("popup")) {
        errorMessage = t("popup_blocked", "Error opening login window. Check if popups are enabled.");
      }
      
      toast({
        title: t("social_login_error", "Social login error"),
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
