import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Shield, Ban, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  document: string;
  balance: number;
  verification_status: string;
  created_at: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_blocked: boolean;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState("");

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

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.document.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">{t("admin_users_title")}</h1>
        <p className="text-muted-foreground">{t("admin_users_desc")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("admin_search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar_url || ""} />
                <AvatarFallback>
                  {user.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{user.full_name}</h3>
                  {user.is_admin && (
                    <Badge variant="default">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {user.is_blocked && (
                    <Badge variant="destructive">
                      <Ban className="h-3 w-3 mr-1" />
                      {t("admin_blocked")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.document}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="text-right space-y-2">
                <p className="text-2xl font-bold">
                  R$ {Number(user.balance).toFixed(2)}
                </p>
                <Badge
                  variant={
                    user.verification_status === "approved"
                      ? "default"
                      : user.verification_status === "under_review"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {user.verification_status === "approved" && t("admin_verified")}
                  {user.verification_status === "under_review" && t("admin_under_review")}
                  {user.verification_status === "rejected" && t("admin_rejected")}
                  {user.verification_status === "pending" && t("pending")}
                </Badge>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBalance(user)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {t("admin_balance_label")}
                  </Button>
                  <Button
                    variant={user.is_admin ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleAdmin(user)}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {user.is_admin ? t("admin_remove_admin") : t("admin_make_admin")}
                  </Button>
                  <Button
                    variant={user.is_blocked ? "default" : "destructive"}
                    size="sm"
                    onClick={() => toggleBlock(user)}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    {user.is_blocked ? t("admin_unblock") : t("admin_block")}
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
