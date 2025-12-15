import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/SignupForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import defaultBannerSignup from "@/assets/banner-signup.webp";

export default function Signup() {
  const { settings } = usePlatformSettings();
  const { customization } = usePlatformCustomization();
  const { isLoading, handleSignup, handleSocialLogin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Use dynamic banner from settings, fallback to default
  const bannerSignup = settings.signup_banner_url || defaultBannerSignup;

  const onSignupSubmit = async (formData: any) => {
    const success = await handleSignup(formData, settings.allow_registration);
    if (success) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background relative overflow-hidden">
      <StarfieldBackground />
      
      {/* Gradient overlay - full screen, above banner, below dialog */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 z-[5] pointer-events-none" />
      

      {/* Banner Section - Left on desktop, Top on mobile */}
      <div className="w-full lg:w-[55%] h-auto lg:h-screen relative z-[1] shrink-0 lg:flex lg:items-center lg:justify-center">
        <img
          src={bannerSignup}
          alt="Signup Banner"
          className="w-full h-auto lg:w-full lg:max-h-full object-contain"
        />
      </div>

      {/* Form Section - Right on desktop, Bottom on mobile */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 pt-8 sm:p-8 lg:p-8 z-10">
        <Card className="w-full max-w-md p-6 sm:p-8 bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl">
          <div className="text-center mb-6 sm:mb-8">
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
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-2">
              {t("create_account", "Create Account")}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("start_journey", "Start your journey with us")}
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
              {t("have_account_login", "Already have an account? Login")}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
