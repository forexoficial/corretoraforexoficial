import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();
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
      toast.error(t("admin_error_approve"));
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

    toast.success(t("admin_transaction_approved"));
    fetchTransactions();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", id);

    if (error) {
      toast.error(t("admin_error_reject"));
      return;
    }

    toast.success(t("admin_transaction_rejected"));
    fetchTransactions();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">{t("admin_transactions_title")}</h1>
        <p className="text-xs md:text-base text-muted-foreground">{t("admin_transactions_desc")}</p>
      </div>

      {/* Mobile: Card layout */}
      <div className="space-y-2 md:hidden">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {transaction.profiles?.full_name || "Usuário"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={transaction.type === "deposit" ? "default" : "secondary"} className="text-[10px] h-5">
                    {transaction.type === "deposit" ? t("admin_deposit") : t("admin_withdrawal")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{transaction.payment_method || "N/A"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(transaction.created_at).toLocaleString("pt-BR", {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">R$ {Number(transaction.amount).toFixed(2)}</p>
                <Badge variant={
                  transaction.status === "completed" ? "default" :
                  transaction.status === "pending" ? "secondary" : "destructive"
                } className="text-[10px] h-5 mt-1">
                  {transaction.status === "completed" && t("admin_complete")}
                  {transaction.status === "pending" && t("pending")}
                  {transaction.status === "failed" && t("failed")}
                </Badge>
              </div>
            </div>
            {transaction.status === "pending" && (
              <div className="flex gap-2 mt-2 pt-2 border-t">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleApprove(transaction)}
                  className="flex-1 h-8 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t("admin_approve")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(transaction.id)}
                  className="flex-1 h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t("admin_reject")}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_user_column")}</TableHead>
              <TableHead>{t("admin_type_column")}</TableHead>
              <TableHead>{t("admin_method_column")}</TableHead>
              <TableHead>{t("admin_value_column")}</TableHead>
              <TableHead>{t("admin_status_column")}</TableHead>
              <TableHead>{t("admin_date_column")}</TableHead>
              <TableHead>{t("admin_actions_column")}</TableHead>
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
                    {transaction.type === "deposit" ? t("admin_deposit") : t("admin_withdrawal")}
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
                    {transaction.status === "completed" && t("admin_complete")}
                    {transaction.status === "pending" && t("pending")}
                    {transaction.status === "failed" && t("failed")}
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
                        {t("admin_approve")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(transaction.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("admin_reject")}
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
