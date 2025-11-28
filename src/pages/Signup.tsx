import { useState } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/SignupForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Signup() {
  const { settings } = usePlatformSettings();
  const { customization } = usePlatformCustomization();
  const { isLoading, handleSignup, handleSocialLogin } = useAuth();
  const navigate = useNavigate();

  const onSignupSubmit = async (formData: any) => {
    const success = await handleSignup(formData, settings.allow_registration);
    if (success) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/10 p-4 relative overflow-hidden">
      <StarfieldBackground />
      
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-20 hover:bg-background/50"
        onClick={() => navigate("/auth")}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <Card className="w-full max-w-md p-8 bg-background/50 backdrop-blur-xl border-primary/20 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          {customization.currentLogo && (
            <div className="flex justify-center mb-4">
              <img 
                src={customization.currentLogo}
                alt="Logo" 
                style={{ height: `${customization.logoHeight}px` }}
                className="object-contain"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
            Criar Conta
          </h1>
          <p className="text-muted-foreground">
            Comece sua jornada conosco
          </p>
        </div>

        <SignupForm onSubmit={onSignupSubmit} isLoading={isLoading} />

        <SocialLoginButtons onSocialLogin={handleSocialLogin} />

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Já tem conta? Fazer login
          </button>
        </div>
      </Card>
    </div>
  );
}
