import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { User, Mail, Phone, FileText, Lock, Check, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SignupFormData } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/useTranslation";
import { detectUserCountry, type CountryInfo } from "@/utils/countryDetection";
import { trackLead } from "@/utils/metaPixel";

interface SignupFormProps {
  onSubmit: (formData: SignupFormData) => void;
  isLoading: boolean;
}

export function SignupForm({ onSubmit, isLoading }: SignupFormProps) {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<CountryInfo | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
    phone: "",
    document: "",
    documentType: "cpf",
    password: "",
  });
  const { toast } = useToast();
  const { t, language } = useTranslation();

  // Only show document step for Brazilian users (Portuguese language)
  const isBrazilian = language === 'pt';
  const totalSteps = isBrazilian ? 5 : 4;

  // Detect user's country on mount
  useEffect(() => {
    detectUserCountry().then(country => {
      console.log('[Signup] Detected country:', country);
      setDetectedCountry(country);
    });
  }, []);

  // Capture affiliate code from URL silently (no notification to user)
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setAffiliateCode(refCode);
    }
  }, [searchParams]);

  const nextStep = () => {
    if (step === 1 && !formData.fullName) {
      toast({ title: t('fill_name'), variant: "destructive" });
      return;
    }
    if (step === 2 && !formData.email) {
      toast({ title: t('fill_email'), variant: "destructive" });
      return;
    }
    if (step === 3 && !formData.phone) {
      toast({ title: t('fill_phone'), variant: "destructive" });
      return;
    }
    if (isBrazilian && step === 4 && !formData.document) {
      toast({ title: t('fill_document'), variant: "destructive" });
      return;
    }
    
    // Track Lead event when user progresses past email step
    if (step === 2) {
      trackLead({ content_name: 'Signup Progress', content_category: 'registration' });
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For non-Brazilian users, generate a unique document ID to avoid unique constraint violations
    const internationalDocument = `INT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    onSubmit({
      ...formData,
      // For non-Brazilian users, generate unique document to avoid constraint violation
      document: isBrazilian ? formData.document : internationalDocument,
      documentType: isBrazilian ? formData.documentType : "international",
      affiliateCode: affiliateCode || undefined,
      // Country detection data
      countryCode: detectedCountry?.countryCode || 'XX',
      countryName: detectedCountry?.countryName || 'Unknown',
      preferredCurrency: detectedCountry?.currency || 'USD',
    });
  };

  const progress = (step / totalSteps) * 100;

  // Build step icons based on whether document step is needed
  const stepIcons = useMemo(() => {
    if (isBrazilian) {
      return [
        { icon: User, label: t('name_step'), completed: step > 1 },
        { icon: Mail, label: t('email_step'), completed: step > 2 },
        { icon: Phone, label: t('phone_step'), completed: step > 3 },
        { icon: FileText, label: t('document_step'), completed: step > 4 },
        { icon: Lock, label: t('password_step'), completed: step > 5 },
      ];
    }
    return [
      { icon: User, label: t('name_step'), completed: step > 1 },
      { icon: Mail, label: t('email_step'), completed: step > 2 },
      { icon: Phone, label: t('phone_step'), completed: step > 3 },
      { icon: Lock, label: t('password_step'), completed: step > 4 },
    ];
  }, [isBrazilian, step, t]);

  // Check if current step is the password step
  const isPasswordStep = isBrazilian ? step === 5 : step === 4;
  // Check if current step is the document step (only for Brazilian)
  const isDocumentStep = isBrazilian && step === 4;
  // Check if current step is the phone step
  const isPhoneStep = step === 3;

  return (
    <>
      <div className="mb-8">
        <Progress value={progress} className="h-2 mb-4" />
        <div className="flex justify-between">
          {stepIcons.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  step > index
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                    : step === index + 1
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item.completed ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <item.icon className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <Label htmlFor="fullName">{t('full_name')}</Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder={t('your_full_name_placeholder')}
              className="mt-1"
            />
            <Button type="button" onClick={nextStep} className="w-full">
              {t('next')}
            </Button>
          </div>
        )}

        {/* Step 2: Email */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <Label htmlFor="email-signup">{t('email')}</Label>
            <Input
              id="email-signup"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('email_placeholder')}
              className="mt-1"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="w-full"
              >
                {t('back')}
              </Button>
              <Button type="button" onClick={nextStep} className="w-full">
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Phone */}
        {isPhoneStep && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <Label htmlFor="phone-signup">{t('phone_number')}</Label>
            <Input
              id="phone-signup"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('phone_placeholder')}
              className="mt-1"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="w-full"
              >
                {t('back')}
              </Button>
              <Button type="button" onClick={nextStep} className="w-full">
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Document (Only for Brazilian users) */}
        {isDocumentStep && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <Label>{t('document_type')}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.documentType === "cpf" ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, documentType: "cpf" })}
                className="flex-1"
              >
                CPF
              </Button>
              <Button
                type="button"
                variant={formData.documentType === "cnpj" ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, documentType: "cnpj" })}
                className="flex-1"
              >
                CNPJ
              </Button>
            </div>
            <Label htmlFor="document">{formData.documentType.toUpperCase()}</Label>
            <Input
              id="document"
              type="text"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              placeholder={formData.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
              className="mt-1"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="w-full"
              >
                {t('back')}
              </Button>
              <Button type="button" onClick={nextStep} className="w-full">
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Password Step (Step 4 for Brazilian, Step 3 for others) */}
        {isPasswordStep && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <Label htmlFor="password-signup">{t('password')}</Label>
            <Input
              id="password-signup"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('password_placeholder')}
              className="mt-1"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="w-full"
              >
                {t('back')}
              </Button>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('creating') : t('create_account_button')}
              </Button>
            </div>
          </div>
        )}
      </form>
    </>
  );
}
