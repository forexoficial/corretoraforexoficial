import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Trade {
  id: string;
  user_id: string;
  asset_id: string;
  amount: number;
  payout: number;
  trade_type: string;
  status: string;
  result: number | null;
  created_at: string;
  expires_at: string;
  profiles: {
    full_name: string;
  } | null;
  assets: {
    name: string;
    symbol: string;
  } | null;
}

export default function AdminTrades() {
  const { t } = useTranslation();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    const { data: tradesData, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      return;
    }

    const tradesWithDetails = await Promise.all(
      (tradesData || []).map(async (trade) => {
        const [profileData, assetData] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", trade.user_id)
            .single(),
          supabase
            .from("assets")
            .select("name, symbol")
            .eq("id", trade.asset_id)
            .single()
        ]);

        return {
          ...trade,
          profiles: profileData.data || { full_name: "Usuário" },
          assets: assetData.data || { name: "Ativo", symbol: "" }
        };
      })
    );

    setTrades(tradesWithDetails as Trade[]);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">{t("admin_trades_title")}</h1>
        <p className="text-xs md:text-base text-muted-foreground">{t("admin_trades_desc")}</p>
      </div>

      {/* Mobile: Card layout */}
      <div className="space-y-2 md:hidden">
        {trades.map((trade) => (
          <Card key={trade.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {trade.profiles?.full_name || "Usuário"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium">{trade.assets?.symbol || "N/A"}</span>
                  <Badge variant={trade.trade_type === "call" ? "default" : "secondary"} className="text-[10px] h-5">
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(trade.created_at).toLocaleString("pt-BR", {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">R$ {Number(trade.amount).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Pay: R$ {Number(trade.payout).toFixed(2)}</p>
                <Badge variant={
                  trade.status === "won" ? "default" :
                  trade.status === "open" ? "secondary" : "destructive"
                } className="text-[10px] h-5 mt-1">
                  {trade.status === "won" && t("admin_won")}
                  {trade.status === "lost" && t("admin_lost")}
                  {trade.status === "open" && t("admin_open")}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_user_column")}</TableHead>
              <TableHead>{t("admin_asset_column")}</TableHead>
              <TableHead>{t("admin_type_column")}</TableHead>
              <TableHead>{t("admin_value_column")}</TableHead>
              <TableHead>{t("admin_payout_column")}</TableHead>
              <TableHead>{t("admin_status_column")}</TableHead>
              <TableHead>{t("admin_date_column")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="font-medium">
                  {trade.profiles?.full_name || "Usuário"}
                </TableCell>
                <TableCell>
                  {trade.assets?.symbol || "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant={trade.trade_type === "call" ? "default" : "secondary"}>
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>R$ {Number(trade.amount).toFixed(2)}</TableCell>
                <TableCell>R$ {Number(trade.payout).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={
                    trade.status === "won" ? "default" :
                    trade.status === "open" ? "secondary" : "destructive"
                  }>
                    {trade.status === "won" && t("admin_won")}
                    {trade.status === "lost" && t("admin_lost")}
                    {trade.status === "open" && t("admin_open")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(trade.created_at).toLocaleString("pt-BR", { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
