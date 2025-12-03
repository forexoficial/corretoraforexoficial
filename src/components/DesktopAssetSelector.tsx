import { useState, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string;
  payout_percentage: number;
}

interface DesktopAssetSelectorProps {
  selectedAssets: Asset[];
  currentAssetId?: string;
  onAssetSelect: (asset: Asset) => void;
  onAssetRemove: (assetId: string) => void;
}

export const DesktopAssetSelector = ({
  selectedAssets,
  currentAssetId,
  onAssetSelect,
  onAssetRemove,
}: DesktopAssetSelectorProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isModalOpen) {
      loadAssets();
    }
  }, [isModalOpen]);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("is_active", true)
      .order('name');

    if (!error && data) {
      setAssets(data);
    }
  };

  // Categorize assets
  const categorizeAsset = (asset: Asset): 'forex' | 'crypto' | 'stocks' => {
    const symbol = asset.symbol.toLowerCase();
    const name = asset.name.toLowerCase();
    
    // Crypto indicators
    if (symbol.includes('btc') || symbol.includes('eth') || symbol.includes('bnb') || 
        symbol.includes('ada') || symbol.includes('doge') || symbol.includes('xrp') ||
        name.includes('bitcoin') || name.includes('ethereum') || name.includes('cardano') ||
        name.includes('dogecoin') || symbol.includes('otc') && name.includes('crypto')) {
      return 'crypto';
    }
    
    // Forex indicators (currency pairs)
    if (symbol.includes('usd') || symbol.includes('eur') || symbol.includes('gbp') || 
        symbol.includes('jpy') || symbol.includes('aud') || symbol.includes('cad') ||
        symbol.includes('chf') || symbol.includes('nzd')) {
      return 'forex';
    }
    
    // Default to stocks
    return 'stocks';
  };

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group assets by category
  const groupedAssets = {
    forex: filteredAssets.filter(a => categorizeAsset(a) === 'forex'),
    crypto: filteredAssets.filter(a => categorizeAsset(a) === 'crypto'),
    stocks: filteredAssets.filter(a => categorizeAsset(a) === 'stocks'),
  };

  const handleAssetClick = (asset: Asset) => {
    const isSelected = selectedAssets.some((a) => a.id === asset.id);
    if (!isSelected) {
      onAssetSelect(asset);
    }
    setIsModalOpen(false);
  };

  const MAX_VISIBLE = 3;
  const visibleAssets = selectedAssets.slice(0, MAX_VISIBLE);
  const stackedCount = selectedAssets.length - MAX_VISIBLE;
  const hasStacked = stackedCount > 0;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="h-12 w-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:scale-105 transition-all flex-shrink-0"
      >
        <Plus className="h-5 w-5 text-foreground" />
      </button>

      {/* Selected Assets - Fixed width container */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Regular visible assets (first 4) */}
        {visibleAssets.map((asset) => {
          const isCurrentAsset = asset.id === currentAssetId;
          return (
            <div
              key={asset.id}
              className={`relative flex items-center gap-2 h-12 pl-3 pr-2 rounded-lg border flex-shrink-0 group overflow-hidden transition-all ${
                isCurrentAsset
                  ? "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.3),0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)] scale-105"
                  : "bg-gradient-to-br from-card to-card/80 border-border/50 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:scale-[1.02]"
              }`}
            >
              {/* Bottom accent bar - enhanced for current asset */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 ${
                isCurrentAsset ? "h-1 shadow-[0_0_10px_rgba(251,146,60,0.5)]" : ""
              }`} />
            
            <button
              onClick={() => onAssetSelect(asset)}
              className="flex items-center gap-2.5 cursor-pointer flex-1"
            >
              {/* Asset Icon with 3D effect */}
              <div className="relative flex-shrink-0">
                {asset.icon_url ? (
                  <img
                    src={asset.icon_url}
                    alt={asset.name}
                    className="w-7 h-7 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-2 ring-border/30"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-2 ring-border/30"
                    style={{ backgroundColor: "#f7931a" }}
                  />
                )}
              </div>
              
              {/* Asset Info */}
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold text-foreground whitespace-nowrap leading-none">
                  {asset.name}
                </span>
                <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap leading-none font-medium">
                  {asset.symbol}
                </span>
              </div>
              
              {/* Payout - Minimalist */}
              <span className="text-xs text-success/80 font-medium whitespace-nowrap ml-auto">
                {asset.payout_percentage}%
              </span>
            </button>
            
            {/* Close button - only show if more than 1 asset */}
            {selectedAssets.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssetRemove(asset.id);
                }}
                className="ml-1 p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
        })}

        {/* Counter badge for additional assets */}
        {hasStacked && (
          <div
            className="h-12 px-4 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-lg border border-primary/30 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)] text-sm font-semibold flex-shrink-0 cursor-pointer hover:shadow-[0_6px_16px_-2px_rgba(0,0,0,0.4)] hover:scale-105 transition-all"
            onClick={() => setIsModalOpen(true)}
          >
            +{stackedCount}
          </div>
        )}
      </div>

      {/* Asset Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 gap-0 bg-card border-border">
          <DialogHeader className="p-4 pb-3 border-b border-border">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Ativos
            </DialogTitle>
            
            {/* Stats */}
            <div className="pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{assets.length}</span> no total • <span className="text-success font-medium">{filteredAssets.length}</span> {filteredAssets.length === 1 ? 'ativo' : 'ativos'}
            </div>
          </DialogHeader>

          {/* Search */}
          <div className="p-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
          </div>

          {/* Asset List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{t("no_assets_found", "No assets found")}</p>
              </div>
            ) : (
              <>
                {/* Forex Section */}
                {groupedAssets.forex.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-muted/50 border-y border-border">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Forex
                      </h3>
                    </div>
                    {groupedAssets.forex.map((asset) => {
                      const isSelected = selectedAssets.some((a) => a.id === asset.id);
                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleAssetClick(asset)}
                          disabled={isSelected}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected ? "bg-accent/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {asset.icon_url ? (
                              <img
                                src={asset.icon_url}
                                alt={asset.name}
                                className="w-8 h-8 rounded-full ring-2 ring-border/30"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full ring-2 ring-border/30"
                                style={{ backgroundColor: "#f7931a" }}
                              />
                            )}
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium text-foreground">
                                {asset.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {asset.symbol}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-success">
                              +{asset.payout_percentage}%
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Crypto Section */}
                {groupedAssets.crypto.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-muted/50 border-y border-border">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Cripto
                      </h3>
                    </div>
                    {groupedAssets.crypto.map((asset) => {
                      const isSelected = selectedAssets.some((a) => a.id === asset.id);
                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleAssetClick(asset)}
                          disabled={isSelected}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected ? "bg-accent/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {asset.icon_url ? (
                              <img
                                src={asset.icon_url}
                                alt={asset.name}
                                className="w-8 h-8 rounded-full ring-2 ring-border/30"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full ring-2 ring-border/30"
                                style={{ backgroundColor: "#f7931a" }}
                              />
                            )}
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium text-foreground">
                                {asset.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {asset.symbol}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-success">
                              +{asset.payout_percentage}%
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Stocks Section */}
                {groupedAssets.stocks.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-muted/50 border-y border-border">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ações
                      </h3>
                    </div>
                    {groupedAssets.stocks.map((asset) => {
                      const isSelected = selectedAssets.some((a) => a.id === asset.id);
                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleAssetClick(asset)}
                          disabled={isSelected}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected ? "bg-accent/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {asset.icon_url ? (
                              <img
                                src={asset.icon_url}
                                alt={asset.name}
                                className="w-8 h-8 rounded-full ring-2 ring-border/30"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full ring-2 ring-border/30"
                                style={{ backgroundColor: "#f7931a" }}
                              />
                            )}
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium text-foreground">
                                {asset.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {asset.symbol}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-success">
                              +{asset.payout_percentage}%
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
