import { useState, useEffect } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { StarfieldBackground } from "@/components/StarfieldBackground";

export default function Auth() {
  const { settings, loading: settingsLoading } = usePlatformSettings();
  const { customization } = usePlatformCustomization();
  const { isLoading, handleLogin, handleSignup, handleSocialLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!settingsLoading && !settings.allow_registration && !isLogin) {
      toast({
        title: "Cadastro desativado",
        description: "O registro de novos usuários está temporariamente desativado",
        variant: "destructive",
      });
      setIsLogin(true);
    }
  }, [settings.allow_registration, isLogin, settingsLoading, toast]);

  const onSignupSubmit = async (formData: any) => {
    const success = await handleSignup(formData, settings.allow_registration);
    if (success) {
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/10 p-4 relative overflow-hidden">
      <StarfieldBackground />
      <Card className="w-full max-w-md p-8 bg-background/50 backdrop-blur-xl border-primary/20 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          {isLogin ? (
            customization.currentLogo && (
              <div className="flex justify-center mb-4">
                <img 
                  src={customization.currentLogo}
                  alt="Logo" 
                  style={{ height: `${customization.logoHeight}px` }}
                  className="object-contain"
                />
              </div>
            )
          ) : (
            <>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
                Criar Conta
              </h1>
              <p className="text-muted-foreground">
                Comece sua jornada conosco
              </p>
            </>
          )}
        </div>

        {isLogin ? (
          <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
        ) : (
          <SignupForm onSubmit={onSignupSubmit} isLoading={isLoading} />
        )}

        <SocialLoginButtons onSocialLogin={handleSocialLogin} />

        {!settingsLoading && settings.allow_registration && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Não tem conta? Criar conta" : "Já tem conta? Fazer login"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
