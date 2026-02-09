import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, User, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AffiliateSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    commission_percentage: 0,
    commission_model: "rev",
    cpa_value: 0,
    cpa_min_deposit: 0,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .single();

      const { data: affiliateData } = await supabase
        .from("affiliates")
        .select("commission_percentage")
        .eq("user_id", user?.id)
        .single();

      // Fetch extra CPA fields separately to avoid type issues with generated types
      const { data: affiliateExtraRaw } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      const affiliateExtra = affiliateExtraRaw as any;

      setProfile({
        full_name: profileData?.full_name || "",
        email: user?.email || "",
        commission_percentage: affiliateData?.commission_percentage || 0,
        commission_model: affiliateExtra?.commission_model || "rev",
        cpa_value: affiliateExtra?.cpa_value || 0,
        cpa_min_deposit: affiliateExtra?.cpa_min_deposit || 0,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profile.full_name })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Configurações</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Gerencie suas informações e preferências
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-xs sm:text-sm">Nome Completo</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
            <Input id="email" value={profile.email} disabled className="text-sm" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <Button onClick={handleUpdateProfile} disabled={loading} size="sm" className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            Informações do Afiliado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Modelo de Comissão</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={profile.commission_model === "cpa" ? "bg-blue-500/10 text-blue-500 border-blue-500/30" : ""}>
                  {profile.commission_model === "cpa" ? "CPA (Valor Fixo)" : "REV (Porcentagem)"}
                </Badge>
              </div>
              {profile.commission_model === "cpa" ? (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    R$ {profile.cpa_value.toFixed(2)}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Você ganha R$ {profile.cpa_value.toFixed(2)} por cada indicado que depositar pelo menos R$ {profile.cpa_min_deposit.toFixed(2)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    {profile.commission_percentage}%
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Você ganha {profile.commission_percentage}% sobre cada trade dos seus referidos
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Status da Conta</Label>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-success animate-pulse"></div>
                <span className="text-base sm:text-lg font-medium">Ativo</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Sua conta está verificada e ativa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Suporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Precisa de ajuda? Entre em contato com nossa equipe de suporte:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              <a href="mailto:suporte@exemplo.com" className="text-xs sm:text-sm text-primary hover:underline break-all">
                suporte@exemplo.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
