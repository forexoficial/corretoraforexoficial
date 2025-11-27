import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Shield, Cookie, Info, Mail, BookOpen, Scale, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface LegalMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface CompanyInfo {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export const LegalMenu = ({ open, onOpenChange }: LegalMenuProps) => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [docsResult, infoResult] = await Promise.all([
        supabase
          .from("legal_documents")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase.from("company_info").select("*"),
      ]);

      if (docsResult.error) throw docsResult.error;
      if (infoResult.error) throw infoResult.error;

      setDocuments(docsResult.data || []);
      
      // Transform company info array into key-value object
      const infoMap: Record<string, string> = {};
      (infoResult.data || []).forEach((item: CompanyInfo) => {
        infoMap[item.key] = item.value;
      });
      setCompanyInfo(infoMap);
    } catch (error: any) {
      toast.error("Erro ao carregar informações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (doc: LegalDocument) => {
    // Here you could navigate to a dedicated page with the full content
    console.log("Open document:", doc.slug);
    // For now, just show a toast
    toast.info("Documento: " + doc.title);
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Scale,
      Shield,
      Cookie,
      Lock,
      FileText,
      BookOpen,
      Info,
      Mail,
    };
    return icons[iconName] || FileText;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Informações Legais
          </SheetTitle>
          <SheetDescription>
            Documentos jurídicos, políticas e informações burocráticas
          </SheetDescription>
        </SheetHeader>
        
        <Separator />
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <>
              <div className="p-6 space-y-2">
                {documents.map((doc) => {
                  const Icon = getIconComponent(doc.icon);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentClick(doc)}
                      className="w-full flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 text-foreground">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {doc.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <Separator className="my-6" />
              
              <div className="p-6 pt-0 space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Informações da Empresa
                  </h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><strong>CNPJ:</strong> {companyInfo.cnpj || "N/A"}</p>
                    <p><strong>Razão Social:</strong> {companyInfo.razao_social || "N/A"}</p>
                    <p><strong>Endereço:</strong> {companyInfo.endereco || "N/A"}</p>
                    <p><strong>Email:</strong> {companyInfo.email_juridico || "N/A"}</p>
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-sm mb-2">
                    Órgãos Reguladores
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {companyInfo.orgao_regulador_1 && <p>• {companyInfo.orgao_regulador_1}</p>}
                    {companyInfo.orgao_regulador_2 && <p>• {companyInfo.orgao_regulador_2}</p>}
                    {companyInfo.orgao_regulador_3 && <p>• {companyInfo.orgao_regulador_3}</p>}
                  </div>
                </div>
                
                <div className="text-center text-xs text-muted-foreground pt-4">
                  <p>© 2025 Todos os direitos reservados</p>
                  <p className="mt-1">
                    Versão dos Termos: {companyInfo.versao_termos || "1.0"} | Atualizado em {companyInfo.data_atualizacao_termos || "Janeiro/2025"}
                  </p>
                </div>
              </div>
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
