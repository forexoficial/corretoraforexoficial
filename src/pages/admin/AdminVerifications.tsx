import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  user_id: string;
  entity_type: string;
  document_type: string;
  document_front_url: string;
  document_back_url: string;
  selfie_url: string;
  business_document_url: string | null;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    document: string;
    verification_status?: string | null;
  } | null;
}

export default function AdminVerifications() {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const getSignedUrl = async (path: string) => {
    try {
      const relativePath = path.split('/verification-documents/')[1] || path;
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(relativePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return path; // Fallback to original path
    }
  };

  const fetchVerifications = async () => {
    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar verificações");
      return;
    }

    // Fetch profile data, fix legacy statuses and get signed URLs
    const verificationsWithProfiles = await Promise.all(
      (data || []).map(async (verification) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, document, verification_status")
          .eq("user_id", verification.user_id)
          .single();

        // Corrigir perfis antigos: se verificação está aprovada mas o perfil não
        if (
          verification.status === "approved" &&
          profileData &&
          profileData.verification_status !== "approved"
        ) {
          await supabase
            .from("profiles")
            .update({ verification_status: "approved" })
            .eq("user_id", verification.user_id);

          profileData.verification_status = "approved";
        }

        // Get signed URLs for all images
        const [documentFrontUrl, documentBackUrl, selfieUrl, businessDocUrl] = await Promise.all([
          getSignedUrl(verification.document_front_url),
          getSignedUrl(verification.document_back_url),
          getSignedUrl(verification.selfie_url),
          verification.business_document_url ? getSignedUrl(verification.business_document_url) : Promise.resolve(null)
        ]);

        return {
          ...verification,
          document_front_url: documentFrontUrl,
          document_back_url: documentBackUrl,
          selfie_url: selfieUrl,
          business_document_url: businessDocUrl,
          profiles: profileData || { full_name: "Usuário", document: "", verification_status: null }
        };
      })
    );

    setVerifications(verificationsWithProfiles as VerificationRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleApprove = async (verificationId: string, userId: string) => {
    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", verificationId);

      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verification_status: "approved" })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast.success("Verificação aprovada com sucesso!");
      setSelectedVerification(null);
      fetchVerifications();
    } catch (error: any) {
      toast.error("Erro ao aprovar: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (verificationId: string, userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", verificationId);

      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verification_status: "rejected" })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast.success("Verificação rejeitada");
      setSelectedVerification(null);
      setRejectionReason("");
      fetchVerifications();
    } catch (error: any) {
      toast.error("Erro ao rejeitar: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      under_review: "default",
      approved: "default",
      rejected: "destructive"
    };
    const colors: any = {
      under_review: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500"
    };

    return (
      <Badge className={colors[status]}>
        {status === "under_review" ? "Em análise" : status === "approved" ? "Aprovado" : "Rejeitado"}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">Verificações de Identidade</h1>
        <p className="text-xs md:text-base text-muted-foreground">Gerencie as solicitações de verificação</p>
      </div>

      <div className="grid gap-2 md:gap-4">
        {verifications.map((verification) => (
          <Card key={verification.id} className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
              <div className="space-y-0.5 md:space-y-1">
                <h3 className="font-semibold text-sm md:text-base">{verification.profiles?.full_name || "Usuário"}</h3>
                <p className="text-[10px] md:text-sm text-muted-foreground">
                  {verification.entity_type === "individual" ? "Pessoa Física" : "Pessoa Jurídica"} • 
                  {verification.document_type.toUpperCase()}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {new Date(verification.created_at).toLocaleString("pt-BR", {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {getStatusBadge(verification.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVerification(verification)}
                  className="h-7 md:h-9 text-xs md:text-sm"
                >
                  <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Ver
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Verification Details Dialog */}
      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Verificação</DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo</Label>
                  <p className="text-sm">{selectedVerification.profiles?.full_name || "N/A"}</p>
                </div>
                <div>
                  <Label>Documento</Label>
                  <p className="text-sm">{selectedVerification.profiles?.document || "N/A"}</p>
                </div>
                <div>
                  <Label>Tipo de Conta</Label>
                  <p className="text-sm">
                    {selectedVerification.entity_type === "individual" ? "Pessoa Física" : "Pessoa Jurídica"}
                  </p>
                </div>
                <div>
                  <Label>Tipo de Documento</Label>
                  <p className="text-sm">{selectedVerification.document_type.toUpperCase()}</p>
                </div>
              </div>

              {/* Document Images */}
              <div className="space-y-4">
                <div>
                  <Label>Frente do Documento</Label>
                  <img
                    src={selectedVerification.document_front_url}
                    alt="Frente"
                    className="w-full rounded-lg border mt-2"
                  />
                </div>
                <div>
                  <Label>Verso do Documento</Label>
                  <img
                    src={selectedVerification.document_back_url}
                    alt="Verso"
                    className="w-full rounded-lg border mt-2"
                  />
                </div>
                <div>
                  <Label>Selfie com Documento</Label>
                  <img
                    src={selectedVerification.selfie_url}
                    alt="Selfie"
                    className="w-full rounded-lg border mt-2"
                  />
                </div>
                {selectedVerification.business_document_url && (
                  <div>
                    <Label>Comprovante CNPJ</Label>
                    <img
                      src={selectedVerification.business_document_url}
                      alt="CNPJ"
                      className="w-full rounded-lg border mt-2"
                    />
                  </div>
                )}
              </div>

              {selectedVerification.status === "under_review" && (
                <>
                  <div className="space-y-3">
                    <Label>Motivo da Rejeição (opcional)</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Descreva o motivo caso rejeite a verificação..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedVerification.id, selectedVerification.user_id)}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedVerification.id, selectedVerification.user_id)}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      {processing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Rejeitar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
