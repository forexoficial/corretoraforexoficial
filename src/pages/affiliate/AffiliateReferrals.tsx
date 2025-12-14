import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Referral {
  id: string;
  referred_user_id: string;
  status: string;
  created_at: string;
  user_name: string;
  total_deposits: number;
  total_commissions: number;
}

export default function AffiliateReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchReferrals();
    }
  }, [user]);

  const fetchReferrals = async () => {
    try {
      // Get affiliate info
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!affiliate) return;

      // Get referrals
      const { data: referralsData, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each referral
      const referralsWithDetails = await Promise.all(
        (referralsData || []).map(async (referral) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", referral.referred_user_id)
            .single();

          // Get transactions for this user
          const { data: transactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", referral.referred_user_id)
            .eq("type", "deposit")
            .eq("status", "completed");

          // Get commissions for this referral
          const { data: commissions } = await supabase
            .from("commissions")
            .select("amount")
            .eq("referral_id", referral.id);

          return {
            ...referral,
            user_name: profile?.full_name || "Usuário",
            total_deposits: transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
            total_commissions: commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0,
          };
        })
      );

      setReferrals(referralsWithDetails);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(
    (referral) =>
      referral.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Meus Referidos</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Acompanhe todos os usuários que você referiu
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Lista de Referidos ({referrals.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-4 sm:mx-0">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                <TableHead className="text-xs sm:text-sm">Data</TableHead>
                <TableHead className="text-xs sm:text-sm">Depósitos</TableHead>
                <TableHead className="text-xs sm:text-sm">Comissões</TableHead>
                <TableHead className="text-xs sm:text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                    Nenhum referido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{referral.user_name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {new Date(referral.created_at).toLocaleDateString("pt-BR", { 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">R$ {formatCurrency(referral.total_deposits)}</TableCell>
                    <TableCell className="text-success font-medium text-xs sm:text-sm">
                      R$ {formatCurrency(referral.total_commissions)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={referral.status === "active" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                        {referral.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
