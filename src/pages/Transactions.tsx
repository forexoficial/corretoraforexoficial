import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowUp, ArrowDown, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTradingHeader } from "@/components/mobile/MobileTradingHeader";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  payment_method: string | null;
  transaction_reference: string | null;
  notes: string | null;
  created_at: string;
}

export default function Transactions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error: any) {
      toast.error(t("error_loading_transactions", "Error loading transactions") + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "cancelled":
        return <Ban className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline",
    };

    const labels: Record<string, string> = {
      completed: t("completed", "Concluído"),
      pending: t("pending", "Pendente"),
      failed: t("failed", "Falhou"),
      cancelled: t("cancel", "Cancelado"),
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <ArrowDown className="w-4 h-4 text-success" />
    ) : (
      <ArrowUp className="w-4 h-4 text-destructive" />
    );
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === "all") return true;
    return transaction.type === filter;
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Mobile Header */}
      {isMobile && (
        <>
          <MobileTradingHeader 
            selectedAsset={{
              name: t("transactions", "Transações"),
              icon_url: ""
            }}
          />
          <div className="h-14" /> {/* Spacer for fixed header */}
        </>
      )}

      {/* Header Navigation */}
      {!isMobile && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="w-full justify-start h-auto bg-transparent rounded-none border-none p-0 gap-6 overflow-x-auto">
                <TabsTrigger
                  value="deposit"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                  onClick={() => navigate("/deposit")}
                >
                  {t("deposit", "Depósito")}
                </TabsTrigger>
                <TabsTrigger
                  value="withdrawal"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                  onClick={() => navigate("/withdrawal")}
                >
                  {t("withdrawal", "Retirada")}
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                >
                  {t("transactions", "Transações")}
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                  onClick={() => navigate("/profile")}
                >
                  {t("profile", "Perfil")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg border border-border">
          {/* Filters */}
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-bold mb-4">{t("transactions", "Transações")}</h2>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                {t("all", "Todas")}
              </Button>
              <Button
                variant={filter === "deposit" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("deposit")}
                className="gap-2"
              >
                <ArrowDown className="w-4 h-4" />
                {t("deposits", "Depósitos")}
              </Button>
              <Button
                variant={filter === "withdrawal" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("withdrawal")}
                className="gap-2"
              >
                <ArrowUp className="w-4 h-4" />
                {t("withdrawals", "Retiradas")}
              </Button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                {t("loading_transactions", "Carregando transações...")}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  {t("no_transactions_found", "Nenhuma transação encontrada")}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => navigate("/deposit")} variant="default">
                    {t("make_deposit", "Fazer Depósito")}
                  </Button>
                  <Button onClick={() => navigate("/withdrawal")} variant="outline">
                    {t("make_withdrawal", "Fazer Retirada")}
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("type_column", "Tipo")}</TableHead>
                    <TableHead>{t("date_column", "Data")}</TableHead>
                    <TableHead className="text-right">{t("value_column", "Valor")}</TableHead>
                    <TableHead>{t("status_column", "Status")}</TableHead>
                    <TableHead>{t("method_column", "Método")}</TableHead>
                    <TableHead>{t("reference_column", "Referência")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="capitalize">
                            {transaction.type === "deposit" ? t("deposit", "Depósito") : t("withdrawal", "Retirada")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span
                          className={
                            transaction.type === "deposit"
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {transaction.type === "deposit" ? "+" : "-"}R${" "}
                          {transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.payment_method || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {transaction.transaction_reference || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Back to Trading Button */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("back_to_trading", "Voltar para Trading")}
          </Button>
        </div>
      </div>
    </div>
  );
}
