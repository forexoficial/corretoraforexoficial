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
import { useTranslation } from "@/hooks/useTranslation";

export const VerificationProgress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
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
        return t("identity_approved");
      case "under_review":
        return t("under_review");
      case "rejected":
        return t("identity_rejected");
      default:
        return t("identity_pending");
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
                  ? t("registration_complete") 
                  : t("complete_registration")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {verificationStatus === "approved"
                  ? t("identity_verified_success")
                  : verificationStatus === "under_review"
                  ? t("documents_under_review")
                  : verificationStatus === "rejected"
                  ? t("verification_rejected_resubmit")
                  : t("verification_required_desc")}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">{t("account_created")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">{t("email_confirmed")}</span>
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
              {verificationStatus === "rejected" ? t("resend_documents") : t("verify_identity")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};