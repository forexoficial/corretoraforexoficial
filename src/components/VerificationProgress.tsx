import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const VerificationProgress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setVerificationStatus(data.verification_status || "pending");
      }
      setLoading(false);
    };

    fetchVerificationStatus();
  }, [user]);

  // Calculate percentage based on status
  const getPercentage = () => {
    switch (verificationStatus) {
      case "approved":
        return 100;
      case "under_review":
        return 80;
      case "rejected":
        return 60;
      default:
        return 60; // pending
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case "approved":
        return "Identidade aprovada";
      case "under_review":
        return "Em análise";
      case "rejected":
        return "Identidade rejeitada";
      default:
        return "Identidade pendente";
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case "approved":
        return "bg-success";
      case "under_review":
        return "bg-yellow-500";
      case "rejected":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const percentage = getPercentage();

  if (loading) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative w-14 h-14 cursor-pointer group">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
            {/* Background circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-muted-foreground/20"
            />
            {/* Progress circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - percentage / 100)}`}
              className={`transition-all group-hover:opacity-80 ${
                verificationStatus === "approved" 
                  ? "text-success" 
                  : verificationStatus === "under_review"
                  ? "text-yellow-500"
                  : verificationStatus === "rejected"
                  ? "text-destructive"
                  : "text-primary"
              }`}
              strokeLinecap="round"
            />
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">
              {percentage}%
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                {verificationStatus === "approved" 
                  ? "Cadastro completo!" 
                  : "Complete seu cadastro"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {verificationStatus === "approved"
                  ? "Sua identidade foi verificada com sucesso. Você já pode operar com dinheiro real."
                  : verificationStatus === "under_review"
                  ? "Seus documentos estão em análise. Aguarde a aprovação para operar com dinheiro real."
                  : verificationStatus === "rejected"
                  ? "Sua verificação foi rejeitada. Por favor, envie os documentos novamente."
                  : "Para desbloquear todos os recursos da plataforma e começar a operar com dinheiro real, é necessário verificar sua identidade."}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Conta criada</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Email confirmado</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <span className="text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>

          {verificationStatus !== "approved" && (
            <Button 
              onClick={() => navigate('/verify-identity')}
              className="w-full"
              size="sm"
            >
              {verificationStatus === "rejected" ? "Reenviar Documentos" : "Verificar Identidade"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};