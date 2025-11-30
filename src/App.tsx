import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TradingHeader } from "@/components/TradingHeader";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { PlatformCustomizationProvider } from "@/contexts/PlatformCustomizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/InstallPrompt";
import Index from "./pages/Index";
import Deposit from "./pages/Deposit";
import Withdrawal from "./pages/Withdrawal";
import Transactions from "./pages/Transactions";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import VerifyIdentity from "./pages/VerifyIdentity";
import Install from "./pages/Install";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminTrades from "./pages/admin/AdminTrades";
import AdminAssets from "./pages/admin/AdminAssets";
import AdminGateways from "./pages/admin/AdminGateways";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPopups from "./pages/admin/AdminPopups";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminLegal from "./pages/admin/AdminLegal";
import AdminBoosters from "./pages/admin/AdminBoosters";
import AdminCharts from "./pages/admin/AdminCharts";
import AdminTradeManagement from "./pages/admin/AdminTradeManagement";
import AdminChartAppearance from "./pages/admin/AdminChartAppearance";
import AdminSocialAuth from "./pages/admin/AdminSocialAuth";
import AdminTransactionRecovery from "./pages/admin/AdminTransactionRecovery";
import AffiliateLayout from "./pages/affiliate/AffiliateLayout";
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";
import AffiliateReferrals from "./pages/affiliate/AffiliateReferrals";
import AffiliateCommissions from "./pages/affiliate/AffiliateCommissions";
import AffiliateTools from "./pages/affiliate/AffiliateTools";
import AffiliateSettings from "./pages/affiliate/AffiliateSettings";
import AffiliateWithdrawals from "./pages/affiliate/AffiliateWithdrawals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <PlatformCustomizationProvider>
                <InstallPrompt />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/install" element={<Install />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deposit"
                element={
                  <ProtectedRoute>
                    <Deposit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/withdrawal"
                element={
                  <ProtectedRoute>
                    <TradingHeader />
                    <Withdrawal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <TradingHeader />
                    <Transactions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <TradingHeader />
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify-identity"
                element={
                  <ProtectedRoute>
                    <VerifyIdentity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="charts" element={<AdminCharts />} />
                <Route path="chart-appearance" element={<AdminChartAppearance />} />
                <Route path="trade-management" element={<AdminTradeManagement />} />
                <Route path="verifications" element={<AdminVerifications />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="transaction-recovery" element={<AdminTransactionRecovery />} />
              <Route path="trades" element={<AdminTrades />} />
              <Route path="assets" element={<AdminAssets />} />
              <Route path="gateways" element={<AdminGateways />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="popups" element={<AdminPopups />} />
              <Route path="boosters" element={<AdminBoosters />} />
                <Route path="affiliates" element={<AdminAffiliates />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="legal" element={<AdminLegal />} />
                <Route path="social-auth" element={<AdminSocialAuth />} />
              </Route>
              
              {/* Affiliate Routes */}
              <Route
                path="/affiliate"
                element={
                  <ProtectedRoute>
                    <AffiliateLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AffiliateDashboard />} />
                <Route path="referrals" element={<AffiliateReferrals />} />
                <Route path="commissions" element={<AffiliateCommissions />} />
                <Route path="tools" element={<AffiliateTools />} />
                <Route path="withdrawals" element={<AffiliateWithdrawals />} />
                <Route path="settings" element={<AffiliateSettings />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
                </PlatformCustomizationProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
