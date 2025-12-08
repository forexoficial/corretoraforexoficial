import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Filter, Globe, CreditCard, Coins, QrCode } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_currency: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    country_code: string | null;
    preferred_currency: string | null;
  } | null;
}

export default function AdminTransactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
          .select("full_name, country_code, preferred_currency")
          .eq("user_id", transaction.user_id)
          .single();

        return {
          ...transaction,
          profiles: profileData || { full_name: "Usuário", country_code: null, preferred_currency: null },
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

  // Get payment method category
  const getPaymentMethodCategory = (method: string | null): string => {
    if (!method) return 'other';
    const m = method.toLowerCase();
    if (m.includes('pix')) return 'pix';
    if (m.includes('stripe') || m.includes('card') || m.includes('cartão')) return 'global';
    if (m.includes('crypto') || m.includes('bitcoin') || m.includes('usdt') || m.includes('coinbase')) return 'crypto';
    return 'other';
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesMethod = methodFilter === "all" || getPaymentMethodCategory(tx.payment_method) === methodFilter;
    const matchesCountry = countryFilter === "all" || 
      (countryFilter === "BR" ? tx.profiles?.country_code === "BR" : tx.profiles?.country_code !== "BR");
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesType && matchesMethod && matchesCountry && matchesStatus;
  });

  // Stats
  const statsByMethod = {
    pix: transactions.filter(tx => getPaymentMethodCategory(tx.payment_method) === 'pix' && tx.status === 'completed'),
    global: transactions.filter(tx => getPaymentMethodCategory(tx.payment_method) === 'global' && tx.status === 'completed'),
    crypto: transactions.filter(tx => getPaymentMethodCategory(tx.payment_method) === 'crypto' && tx.status === 'completed'),
  };

  const brazilTotal = transactions
    .filter(tx => tx.profiles?.country_code === 'BR' && tx.status === 'completed' && tx.type === 'deposit')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const internationalTotal = transactions
    .filter(tx => tx.profiles?.country_code !== 'BR' && tx.status === 'completed' && tx.type === 'deposit')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">{t("admin_transactions_title")}</h1>
        <p className="text-xs md:text-base text-muted-foreground">{t("admin_transactions_desc")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">PIX</span>
          </div>
          <p className="text-lg font-bold mt-1">{statsByMethod.pix.length}</p>
          <p className="text-[10px] text-muted-foreground">
            R$ {statsByMethod.pix.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Global</span>
          </div>
          <p className="text-lg font-bold mt-1">{statsByMethod.global.length}</p>
          <p className="text-[10px] text-muted-foreground">
            $ {statsByMethod.global.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Crypto</span>
          </div>
          <p className="text-lg font-bold mt-1">{statsByMethod.crypto.length}</p>
          <p className="text-[10px] text-muted-foreground">
            $ {statsByMethod.crypto.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">🇧🇷 Brasil</span>
          </div>
          <p className="text-lg font-bold mt-1">R$ {brazilTotal.toFixed(2)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">🌍 Internacional</span>
          </div>
          <p className="text-lg font-bold mt-1">$ {internationalTotal.toFixed(2)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-8"
        >
          <Filter className="h-3 w-3 mr-1" />
          Filtros
        </Button>
        {showFilters && (
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="deposit">Depósitos</SelectItem>
                <SelectItem value="withdrawal">Saques</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos métodos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="global">Global (Stripe)</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos países</SelectItem>
                <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                <SelectItem value="INT">🌍 Internacional</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setMethodFilter("all");
                setCountryFilter("all");
                setStatusFilter("all");
              }}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </>
        )}
      </div>

      {/* Mobile: Card layout */}
      <div className="space-y-2 md:hidden">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm truncate">
                    {transaction.profiles?.full_name || "Usuário"}
                  </p>
                  {transaction.profiles?.country_code && (
                    <span className="text-xs">{transaction.profiles.country_code === 'BR' ? '🇧🇷' : '🌍'}</span>
                  )}
                </div>
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
                <p className="font-bold text-sm">
                  {transaction.profiles?.preferred_currency === 'BRL' ? 'R$' : '$'} {Number(transaction.amount).toFixed(2)}
                </p>
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
              <TableHead>País</TableHead>
              <TableHead>{t("admin_type_column")}</TableHead>
              <TableHead>{t("admin_method_column")}</TableHead>
              <TableHead>{t("admin_value_column")}</TableHead>
              <TableHead>{t("admin_status_column")}</TableHead>
              <TableHead>{t("admin_date_column")}</TableHead>
              <TableHead>{t("admin_actions_column")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.profiles?.full_name || "Usuário"}
                </TableCell>
                <TableCell>
                  {transaction.profiles?.country_code === 'BR' ? '🇧🇷' : transaction.profiles?.country_code || '🌍'}
                </TableCell>
                <TableCell>
                  <Badge variant={transaction.type === "deposit" ? "default" : "secondary"}>
                    {transaction.type === "deposit" ? t("admin_deposit") : t("admin_withdrawal")}
                  </Badge>
                </TableCell>
                <TableCell>{transaction.payment_method || "N/A"}</TableCell>
                <TableCell className="font-bold">
                  {transaction.profiles?.preferred_currency === 'BRL' ? 'R$' : '$'} {Number(transaction.amount).toFixed(2)}
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
