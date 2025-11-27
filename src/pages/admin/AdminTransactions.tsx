import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      return;
    }

    const transactionsWithProfiles = await Promise.all(
      (data || []).map(async (transaction) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", transaction.user_id)
          .single();

        return {
          ...transaction,
          profiles: profileData || { full_name: "Usuário" },
        };
      })
    );

    setTransactions(transactionsWithProfiles as Transaction[]);
    setLoading(false);
  };

  const handleApprove = async (transaction: Transaction) => {
    const { error: txError } = await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", transaction.id);

    if (txError) {
      toast.error("Erro ao aprovar transação");
      return;
    }

    // Update user balance
    if (transaction.type === "deposit") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", transaction.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: Number(profile.balance) + Number(transaction.amount) })
          .eq("user_id", transaction.user_id);
      }
    }

    toast.success("Transação aprovada com sucesso!");
    fetchTransactions();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao rejeitar transação");
      return;
    }

    toast.success("Transação rejeitada!");
    fetchTransactions();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Transações</h1>
        <p className="text-muted-foreground">Histórico de todas as transações</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.profiles?.full_name || "Usuário"}
                </TableCell>
                <TableCell>
                  <Badge variant={transaction.type === "deposit" ? "default" : "secondary"}>
                    {transaction.type === "deposit" ? "Depósito" : "Saque"}
                  </Badge>
                </TableCell>
                <TableCell>{transaction.payment_method || "N/A"}</TableCell>
                <TableCell className="font-bold">
                  R$ {Number(transaction.amount).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    transaction.status === "completed" ? "default" :
                    transaction.status === "pending" ? "secondary" : "destructive"
                  }>
                    {transaction.status === "completed" && "Completo"}
                    {transaction.status === "pending" && "Pendente"}
                    {transaction.status === "failed" && "Falhou"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(transaction.created_at).toLocaleString("pt-BR", {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  {transaction.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(transaction)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(transaction.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
