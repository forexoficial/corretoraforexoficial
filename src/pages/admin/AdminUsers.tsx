import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Shield, Ban, Pencil, Globe, Filter, X, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  document: string;
  phone: string | null;
  email: string | null;
  balance: number;
  verification_status: string;
  created_at: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  country_code: string | null;
  country_name: string | null;
  preferred_currency: string | null;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState("");
  
  // Filters
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Unique countries and currencies from users
  const uniqueCountries = [...new Set(users.map(u => u.country_code).filter(Boolean))] as string[];
  const uniqueCurrencies = [...new Set(users.map(u => u.preferred_currency).filter(Boolean))] as string[];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const toggleAdmin = async (user: User) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !user.is_admin })
      .eq("id", user.id);

    if (error) {
      toast.error(t("admin_error_change_role"));
      return;
    }

    toast.success(
      user.is_admin ? t("admin_admin_removed") : t("admin_admin_promoted")
    );
    fetchUsers();
  };

  const toggleBlock = async (user: User) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !user.is_blocked })
      .eq("id", user.id);

    if (error) {
      toast.error(t("admin_error_change_block"));
      return;
    }

    toast.success(
      user.is_blocked
        ? t("admin_user_unblocked")
        : t("admin_user_blocked")
    );
    fetchUsers();
  };

  const handleEditBalance = (user: User) => {
    setEditingUser(user);
    setNewBalance(user.balance.toString());
    setEditDialogOpen(true);
  };

  const saveBalance = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({ balance: Number(newBalance) })
      .eq("id", editingUser.id);

    if (error) {
      toast.error(t("admin_error_update_balance"));
      return;
    }

    toast.success(t("admin_balance_updated"));
    setEditDialogOpen(false);
    fetchUsers();
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.document.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = countryFilter === "all" || user.country_code === countryFilter;
    const matchesCurrency = currencyFilter === "all" || user.preferred_currency === currencyFilter;
    return matchesSearch && matchesCountry && matchesCurrency;
  });

  // Stats by filter
  const brazilianUsers = users.filter(u => u.country_code === 'BR').length;
  const internationalUsers = users.filter(u => u.country_code && u.country_code !== 'BR').length;
  const totalBalanceBRL = users.filter(u => u.preferred_currency === 'BRL').reduce((sum, u) => sum + Number(u.balance || 0), 0);
  const totalBalanceUSD = users.filter(u => u.preferred_currency !== 'BRL').reduce((sum, u) => sum + Number(u.balance || 0), 0);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">{t("admin_users_title")}</h1>
        <p className="text-xs md:text-base text-muted-foreground">{t("admin_users_desc")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Brasil</span>
          </div>
          <p className="text-lg md:text-2xl font-bold mt-1">{brazilianUsers}</p>
          <p className="text-[10px] text-muted-foreground">R$ {totalBalanceBRL.toFixed(2)}</p>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Internacional</span>
          </div>
          <p className="text-lg md:text-2xl font-bold mt-1">{internationalUsers}</p>
          <p className="text-[10px] text-muted-foreground">$ {totalBalanceUSD.toFixed(2)}</p>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-xs text-muted-foreground">Total BRL</div>
          <p className="text-lg md:text-xl font-bold text-green-500">R$ {totalBalanceBRL.toFixed(2)}</p>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-xs text-muted-foreground">Total USD</div>
          <p className="text-lg md:text-xl font-bold text-blue-500">$ {totalBalanceUSD.toFixed(2)}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 md:h-10 text-sm"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className="h-9 md:h-10"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {showFilters && (
        <Card className="p-3 md:p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs mb-1 block">País</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os países</SelectItem>
                  <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                  {uniqueCountries.filter(c => c !== 'BR').map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs mb-1 block">Moeda</Label>
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as moedas</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setCountryFilter("all");
                  setCurrencyFilter("all");
                }}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <Avatar className="h-10 w-10 md:h-16 md:w-16">
                <AvatarImage src={user.avatar_url || ""} />
                <AvatarFallback className="text-xs md:text-base">
                  {user.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 md:gap-2">
                  <h3 className="font-semibold text-sm md:text-lg truncate">{user.full_name}</h3>
                  {user.is_admin && (
                    <Badge variant="default" className="text-[10px] md:text-xs h-5">
                      <Shield className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                      Admin
                    </Badge>
                  )}
                  {user.is_blocked && (
                    <Badge variant="destructive" className="text-[10px] md:text-xs h-5">
                      <Ban className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                      {t("admin_blocked")}
                    </Badge>
                  )}
                  {user.country_code && (
                    <Badge variant="outline" className="text-[10px] md:text-xs h-5">
                      <Globe className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                      {user.country_code === 'BR' ? '🇧🇷' : user.country_code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{user.document}</p>
                {user.email && (
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <span>{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                  {user.country_name && <span>• {user.country_name}</span>}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <p className="text-lg md:text-2xl font-bold">
                  {user.preferred_currency === 'BRL' ? 'R$' : '$'} {Number(user.balance).toFixed(2)}
                </p>
                <Badge
                  variant={
                    user.verification_status === "approved"
                      ? "default"
                      : user.verification_status === "under_review"
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-[10px] md:text-xs"
                >
                  {user.verification_status === "approved" && t("admin_verified")}
                  {user.verification_status === "under_review" && t("admin_under_review")}
                  {user.verification_status === "rejected" && t("admin_rejected")}
                  {user.verification_status === "pending" && t("pending")}
                </Badge>
                <div className="flex flex-wrap gap-1 md:gap-2 mt-1 md:mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBalance(user)}
                    className="h-7 md:h-8 text-[10px] md:text-xs px-2 md:px-3"
                  >
                    <Pencil className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    {t("admin_balance_label")}
                  </Button>
                  <Button
                    variant={user.is_admin ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleAdmin(user)}
                    className="h-7 md:h-8 text-[10px] md:text-xs px-2 md:px-3"
                  >
                    <Shield className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    <span className="hidden sm:inline">{user.is_admin ? t("admin_remove_admin") : t("admin_make_admin")}</span>
                    <span className="sm:hidden">{user.is_admin ? "Remover" : "Admin"}</span>
                  </Button>
                  <Button
                    variant={user.is_blocked ? "default" : "destructive"}
                    size="sm"
                    onClick={() => toggleBlock(user)}
                    className="h-7 md:h-8 text-[10px] md:text-xs px-2 md:px-3"
                  >
                    <Ban className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    <span className="hidden sm:inline">{user.is_blocked ? t("admin_unblock") : t("admin_block")}</span>
                    <span className="sm:hidden">{user.is_blocked ? "Desbl." : "Bloq."}</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin_edit_balance")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin_user_label")}</Label>
              <Input value={editingUser?.full_name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t("admin_new_balance")}</Label>
              <Input
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
              />
            </div>
            <Button onClick={saveBalance} className="w-full">
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
