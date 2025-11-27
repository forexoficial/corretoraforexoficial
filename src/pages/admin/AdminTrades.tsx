import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Negociações</h1>
        <p className="text-muted-foreground">Histórico de todas as negociações</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
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
                    {trade.status === "won" && "Ganhou"}
                    {trade.status === "lost" && "Perdeu"}
                    {trade.status === "open" && "Aberto"}
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
