import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { User, Mail, FileText, Lock, Check, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SignupFormData } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/useTranslation";

interface SignupFormProps {
  onSubmit: (formData: SignupFormData) => void;
  isLoading: boolean;
}

export function SignupForm({ onSubmit, isLoading }: SignupFormProps) {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
    document: "",
    documentType: "cpf",
    password: "",
  });
  const { toast } = useToast();
  const { t } = useTranslation();

  // Capture affiliate code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setAffiliateCode(refCode);
      toast({
        title: t('affiliate_link_detected'),
        description: `${t('registering_with_code')} ${refCode}`,
      });
    }
  }, [searchParams, toast, t]);

  const nextStep = () => {
    if (step === 1 && !formData.fullName) {
      toast({ title: t('fill_name'), variant: "destructive" });
      return;
    }
    if (step === 2 && !formData.email) {
      toast({ title: t('fill_email'), variant: "destructive" });
      return;
    }
    if (step === 3 && !formData.document) {
      toast({ title: t('fill_document'), variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      affiliateCode: affiliateCode || undefined,
    });
  };

  const progress = (step / 4) * 100;

  const stepIcons = [
    { icon: User, label: t('name_step'), completed: step > 1 },
    { icon: Mail, label: t('email_step'), completed: step > 2 },
    { icon: FileText, label: t('document_step'), completed: step > 3 },
    { icon: Lock, label: t('password_step'), completed: step > 4 },
  ];

  return (
    <>
      {affiliateCode && (
        <Alert className="mb-6 bg-primary/10 border-primary/20">
          <Gift className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>{t('affiliate_link_active')}</strong> {affiliateCode}
          </AlertDescription>
        </Alert>
      )}
      
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
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <Label htmlFor="email-signup">{t('email')}</Label>
            <Input
              id="email-signup"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
              className="mt-1"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
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
        {step === 3 && (
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
                onClick={() => setStep(step - 1)}
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
        {step === 4 && (
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
                onClick={() => setStep(step - 1)}
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
