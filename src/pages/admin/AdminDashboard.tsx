import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Shield, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    activeTrades: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, verificationsRes, tradesRes, transactionsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "under_review"),
        supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("transactions").select("*", { count: "exact", head: true })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        pendingVerifications: verificationsRes.count || 0,
        activeTrades: tradesRes.count || 0,
        totalTransactions: transactionsRes.count || 0
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: t("admin_total_users"),
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: t("admin_pending_verifications"),
      value: stats.pendingVerifications,
      icon: Shield,
      color: "text-yellow-500"
    },
    {
      title: t("admin_active_trades"),
      value: stats.activeTrades,
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      title: t("admin_total_transactions"),
      value: stats.totalTransactions,
      icon: DollarSign,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">{t("admin_dashboard_title")}</h1>
        <p className="text-muted-foreground">{t("admin_dashboard_desc")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <Icon className={cn("h-12 w-12", stat.color)} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
