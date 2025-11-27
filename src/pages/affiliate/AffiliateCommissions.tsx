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
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Commission {
  id: string;
  amount: number;
  created_at: string;
  referral_id: string;
  transaction_id: string | null;
  referral_name: string;
}

interface CommissionStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  pending: number;
}

export default function AffiliateCommissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCommissions();
    }
  }, [user]);

  const fetchCommissions = async () => {
    try {
      // Get affiliate info
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (!affiliate) return;

      // Get commissions
      const { data: commissionsData, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch referral details for each commission
      const commissionsWithDetails = await Promise.all(
        (commissionsData || []).map(async (commission) => {
          const { data: referral } = await supabase
            .from("referrals")
            .select("referred_user_id")
            .eq("id", commission.referral_id)
            .single();

          let referralName = "Usuário";
          if (referral) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", referral.referred_user_id)
              .single();
            
            referralName = profile?.full_name || "Usuário";
          }

          return {
            ...commission,
            referral_name: referralName,
          };
        })
      );

      setCommissions(commissionsWithDetails);

      // Calculate stats
      const total = commissionsWithDetails.reduce((sum, c) => sum + Number(c.amount), 0);
      
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonth = commissionsWithDetails
        .filter(c => new Date(c.created_at) >= firstDayThisMonth)
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const lastMonth = commissionsWithDetails
        .filter(c => {
          const date = new Date(c.created_at);
          return date >= firstDayLastMonth && date <= lastDayLastMonth;
        })
        .reduce((sum, c) => sum + Number(c.amount), 0);

      setStats({
        total,
        thisMonth,
        lastMonth,
        pending: Number(affiliate.total_commission) - total
      });

    } catch (error) {
      console.error("Error fetching commissions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Comissões</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Histórico completo de todas as suas comissões
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Recebido</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-success">
              R$ {formatCurrency(stats.total)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {commissions.length} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Este Mês</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              R$ {formatCurrency(stats.thisMonth)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Ganhos de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Mês Anterior</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              R$ {formatCurrency(stats.lastMonth)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Ganhos do mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pendente</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-warning">
              R$ {formatCurrency(stats.pending)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              A receber
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Histórico de Comissões</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-4 sm:mx-0">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Data</TableHead>
                <TableHead className="text-xs sm:text-sm">Referido</TableHead>
                <TableHead className="text-xs sm:text-sm">Comissão</TableHead>
                <TableHead className="hidden sm:table-cell text-xs sm:text-sm">ID Transação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                    Nenhuma comissão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="text-xs sm:text-sm">
                      {new Date(commission.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {commission.referral_name}
                    </TableCell>
                    <TableCell className="text-success font-bold text-xs sm:text-sm">
                      R$ {formatCurrency(commission.amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                      {commission.transaction_id?.slice(0, 8) || "N/A"}
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
