import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Loader2, 
  Upload, 
  Camera, 
  CheckCircle, 
  User, 
  FileText, 
  Image as ImageIcon,
  Building2,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { CameraCapture } from "@/components/CameraCapture";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTradingHeader } from "@/components/mobile/MobileTradingHeader";

export default function VerifyIdentity() {
  const { user } = useAuth();
  const { customization } = usePlatformCustomization();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [entityType, setEntityType] = useState<"individual" | "business">("individual");
  const [documentType, setDocumentType] = useState<"rg" | "cnh">("rg");
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"front" | "back" | "selfie" | null>(null);

  // Debug: log language detection
  console.log('[VerifyIdentity] Language detected:', language, '| isBrazilian:', language === 'pt');

  // Check if user is Brazilian (Portuguese language)
  // isBrazilian is true ONLY when language is explicitly 'pt'
  const isBrazilian = language === 'pt';

  // For non-Brazilian users, force individual account type
  const effectiveEntityType = isBrazilian ? entityType : "individual";
  
  // Dynamic steps based on language and entity type
  const STEPS = [
    { id: 1, name: t('kyc_step_account'), icon: User },
    { id: 2, name: t('kyc_step_document'), icon: FileText },
    { id: 3, name: t('kyc_step_front'), icon: ImageIcon },
    { id: 4, name: t('kyc_step_back'), icon: ImageIcon },
    { id: 5, name: t('kyc_step_selfie'), icon: Camera },
  ];

  const maxSteps = (isBrazilian && effectiveEntityType === "business") ? 6 : 5;
  const progress = (currentStep / maxSteps) * 100;

  const handleFileUpload = async (file: File, type: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("verification-documents")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleNext = () => {
    if (currentStep === 1 && !effectiveEntityType) {
      toast.error(t('kyc_select_account_type'));
      return;
    }
    if (currentStep === 2 && !documentType) {
      toast.error(t('kyc_select_document_type'));
      return;
    }
    if (currentStep === 3 && !documentFront) {
      toast.error(t('kyc_upload_front'));
      return;
    }
    if (currentStep === 4 && !documentBack) {
      toast.error(t('kyc_upload_back'));
      return;
    }
    if (currentStep === 5 && !selfie) {
      toast.error(t('kyc_upload_selfie'));
      return;
    }
    if (currentStep === 6 && effectiveEntityType === "business" && !businessDoc) {
      toast.error(t('kyc_upload_business_doc'));
      return;
    }

    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const [frontUrl, backUrl, selfieUrl, businessUrl] = await Promise.all([
        handleFileUpload(documentFront!, "document-front"),
        handleFileUpload(documentBack!, "document-back"),
        handleFileUpload(selfie!, "selfie"),
        businessDoc ? handleFileUpload(businessDoc, "business-doc") : Promise.resolve(null)
      ]);

      const { error: insertError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user!.id,
          entity_type: effectiveEntityType,
          document_type: documentType,
          document_front_url: frontUrl,
          document_back_url: backUrl,
          selfie_url: selfieUrl,
          business_document_url: businessUrl,
          status: "under_review"
        });

      if (insertError) throw insertError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          verification_status: "under_review",
          verification_submitted_at: new Date().toISOString()
        })
        .eq("user_id", user!.id);

      if (profileError) throw profileError;

      toast.success(t('kyc_success'));
      navigate("/profile");
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(t('kyc_error') + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get document type display name based on language
  const getDocumentTypeName = () => {
    if (isBrazilian) {
      return documentType === 'rg' ? 'RG' : 'CNH';
    }
    return documentType === 'rg' ? t('kyc_id_card') : t('kyc_drivers_license');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <User className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">{t('kyc_account_type')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('kyc_account_type_desc')}
              </p>
            </div>

            <RadioGroup value={effectiveEntityType} onValueChange={(v: any) => isBrazilian && setEntityType(v)}>
              <div className={`flex items-center space-x-4 p-4 border-2 rounded-xl hover:border-primary transition-all cursor-pointer ${effectiveEntityType === 'individual' ? 'border-primary bg-primary/5' : ''}`}>
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">{t('kyc_individual')}</div>
                      <div className="text-sm text-muted-foreground">{t('kyc_individual_desc')}</div>
                    </div>
                  </div>
                </Label>
              </div>
              {/* Only show business option for Brazilian users */}
              {isBrazilian && (
                <div className={`flex items-center space-x-4 p-4 border-2 rounded-xl hover:border-primary transition-all cursor-pointer ${effectiveEntityType === 'business' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5" />
                      <div>
                        <div className="font-semibold">{t('kyc_business')}</div>
                        <div className="text-sm text-muted-foreground">{t('kyc_business_desc')}</div>
                      </div>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">{t('kyc_document_type')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('kyc_document_type_desc')}
              </p>
            </div>

            <RadioGroup value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
              <div className={`flex items-center space-x-4 p-4 border-2 rounded-xl hover:border-primary transition-all cursor-pointer ${documentType === 'rg' ? 'border-primary bg-primary/5' : ''}`}>
                <RadioGroupItem value="rg" id="rg" />
                <Label htmlFor="rg" className="cursor-pointer flex-1">
                  <div className="font-semibold">{isBrazilian ? t('kyc_rg') : t('kyc_id_card')}</div>
                  <div className="text-sm text-muted-foreground">{isBrazilian ? t('kyc_rg_desc') : t('kyc_id_card_desc')}</div>
                </Label>
              </div>
              <div className={`flex items-center space-x-4 p-4 border-2 rounded-xl hover:border-primary transition-all cursor-pointer ${documentType === 'cnh' ? 'border-primary bg-primary/5' : ''}`}>
                <RadioGroupItem value="cnh" id="cnh" />
                <Label htmlFor="cnh" className="cursor-pointer flex-1">
                  <div className="font-semibold">{isBrazilian ? t('kyc_cnh') : t('kyc_drivers_license')}</div>
                  <div className="text-sm text-muted-foreground">{isBrazilian ? t('kyc_cnh_desc') : t('kyc_drivers_license_desc')}</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">{t('kyc_document_front')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('kyc_document_front_desc')} {getDocumentTypeName()}
              </p>
            </div>

            {documentFront ? (
              <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/20">
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="h-12 w-12 text-success animate-scale-in" />
                  <div>
                    <p className="font-semibold">{t('kyc_document_uploaded')}</p>
                    <p className="text-sm text-muted-foreground">{documentFront.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDocumentFront(null)}>
                    {t('kyc_change_photo')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-all bg-muted/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDocumentFront(e.target.files?.[0] || null)}
                    className="hidden"
                    id="doc-front"
                  />
                  <label htmlFor="doc-front" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-semibold text-sm mb-1">{t('kyc_upload_file')}</p>
                    <p className="text-xs text-muted-foreground">{t('kyc_from_device')}</p>
                  </label>
                </div>

                <button
                  onClick={() => {
                    setCameraMode("front");
                    setShowCamera(true);
                  }}
                  className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-all bg-muted/20"
                >
                  <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold text-sm mb-1">{t('kyc_open_camera')}</p>
                  <p className="text-xs text-muted-foreground">{t('kyc_take_photo')}</p>
                </button>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">💡 {t('kyc_tips_title')}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {t('kyc_tip_lighting')}</li>
                <li>• {t('kyc_tip_readable')}</li>
                <li>• {t('kyc_tip_no_glare')}</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">{t('kyc_document_back')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('kyc_document_back_desc')} {getDocumentTypeName()}
              </p>
            </div>

            {documentBack ? (
              <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/20">
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="h-12 w-12 text-success animate-scale-in" />
                  <div>
                    <p className="font-semibold">{t('kyc_document_uploaded')}</p>
                    <p className="text-sm text-muted-foreground">{documentBack.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDocumentBack(null)}>
                    {t('kyc_change_photo')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-all bg-muted/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDocumentBack(e.target.files?.[0] || null)}
                    className="hidden"
                    id="doc-back"
                  />
                  <label htmlFor="doc-back" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-semibold text-sm mb-1">{t('kyc_upload_file')}</p>
                    <p className="text-xs text-muted-foreground">{t('kyc_from_device')}</p>
                  </label>
                </div>

                <button
                  onClick={() => {
                    setCameraMode("back");
                    setShowCamera(true);
                  }}
                  className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-all bg-muted/20"
                >
                  <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold text-sm mb-1">{t('kyc_open_camera')}</p>
                  <p className="text-xs text-muted-foreground">{t('kyc_take_photo')}</p>
                </button>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">{t('kyc_selfie')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('kyc_selfie_desc')}
              </p>
            </div>

            {selfie ? (
              <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/20">
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle className="h-12 w-12 text-success animate-scale-in" />
                  <div>
                    <p className="font-semibold">{t('kyc_document_uploaded')}</p>
                    <p className="text-sm text-muted-foreground">{selfie.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelfie(null)}>
                    {t('kyc_change_photo')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-all bg-muted/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                    className="hidden"
                    id="selfie"
                  />
                  <label htmlFor="selfie" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-semibold text-sm mb-1">{t('kyc_upload_file')}</p>
                    <p className="text-xs text-muted-foreground">{t('kyc_from_device')}</p>
                  </label>
                </div>

                <button
                  onClick={() => {
                    setCameraMode("selfie");
                    setShowCamera(true);
                  }}
                  className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-all bg-muted/20"
                >
                  <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold text-sm mb-1">{t('kyc_open_camera')}</p>
                  <p className="text-xs text-muted-foreground">{t('kyc_take_selfie')}</p>
                </button>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">📸 {t('kyc_selfie_tips_title')}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {t('kyc_selfie_tip_hold')}</li>
                <li>• {t('kyc_selfie_tip_visible')}</li>
                <li>• {t('kyc_selfie_tip_lighting')}</li>
                <li>• {t('kyc_selfie_tip_no_accessories')}</li>
              </ul>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">{t('kyc_business_doc')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('kyc_business_doc_desc')}
              </p>
            </div>

            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary transition-all bg-muted/20">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setBusinessDoc(e.target.files?.[0] || null)}
                className="hidden"
                id="business-doc"
              />
              <label htmlFor="business-doc" className="cursor-pointer">
                {businessDoc ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle className="h-12 w-12 text-success animate-scale-in" />
                    <div>
                      <p className="font-semibold">{t('kyc_document_uploaded')}</p>
                      <p className="text-sm text-muted-foreground">{businessDoc.name}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.preventDefault();
                      setBusinessDoc(null);
                    }}>
                      {t('kyc_change_file')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-semibold mb-1">{t('kyc_click_to_upload')}</p>
                    <p className="text-sm text-muted-foreground">{t('kyc_file_formats')}</p>
                  </>
                )}
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = currentStep === maxSteps;

  const handleCameraCapture = (file: File) => {
    if (cameraMode === "front") {
      setDocumentFront(file);
    } else if (cameraMode === "back") {
      setDocumentBack(file);
    } else if (cameraMode === "selfie") {
      setSelfie(file);
    }
    setShowCamera(false);
    setCameraMode(null);
  };

  return (
    <>
      {showCamera && cameraMode && (
        <CameraCapture
          orientation={cameraMode === "selfie" ? "vertical" : "horizontal"}
          onCapture={handleCameraCapture}
          onClose={() => {
            setShowCamera(false);
            setCameraMode(null);
          }}
          title={
            cameraMode === "front"
              ? t('kyc_camera_front_title')
              : cameraMode === "back"
              ? t('kyc_camera_back_title')
              : t('kyc_camera_selfie_title')
          }
          subtitle={
            cameraMode === "selfie"
              ? t('kyc_camera_selfie_subtitle')
              : t('kyc_camera_doc_subtitle')
          }
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <>
          <MobileTradingHeader 
            selectedAsset={{
              name: t('kyc_title', 'Verificar Identidade'),
              icon_url: ""
            }}
          />
          <div className="mobile-header-spacer" />
        </>
      )}

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 p-3 pb-16">
        <div className="max-w-2xl mx-auto py-4">
        {/* KYC Symbol Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              
              {/* Main KYC badge */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 p-1 shadow-2xl">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xl font-black text-primary tracking-tight">KYC</span>
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Corner badges */}
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success shadow-lg flex items-center justify-center animate-bounce-subtle">
                <CheckCircle className="w-5 h-5 text-success-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-medium">{t('kyc_progress')}</span>
            <span className="text-xs font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stepper */}
        <div className="flex justify-between mb-6 relative">
          {STEPS.slice(0, (isBrazilian && effectiveEntityType === "business") ? 6 : 5).map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all
                  ${isCompleted ? 'bg-success text-success-foreground' : ''}
                  ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-[10px] text-center font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.name}
                </span>
              </div>
              );
            })}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-0" />
        </div>

        {/* Step Content */}
        <Card className="p-4 sm:p-6 mb-4">
          {renderStepContent()}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex-1"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          
          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? t('kyc_sending') : t('kyc_finalize')}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex-1"
              size="lg"
            >
              {t('next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Back to Trading Button */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('kyc_back_to_trading')}
          </Button>
        </div>

        {/* Platform Logo */}
        {customization.currentLogo && (
          <div className="mt-6 flex justify-center">
            <img 
              src={customization.currentLogo}
              alt="Logo" 
              className="h-8 opacity-50"
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
