import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformState {
  selectedAssets: string[];
  currentAssetId: string | null;
}

export function usePersistentPlatformState() {
  const [state, setState] = useState<PlatformState>({
    selectedAssets: [],
    currentAssetId: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from database on mount
  useEffect(() => {
    const loadState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[PersistentState] Usuário não autenticado');
        setIsLoaded(true);
        return;
      }

      console.log('[PersistentState] Carregando estado do usuário:', user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('selected_assets, current_asset_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[PersistentState] Erro ao carregar perfil:', error);
      }

      if (profile) {
        console.log('[PersistentState] Estado carregado:', {
          selectedAssets: profile.selected_assets,
          currentAssetId: profile.current_asset_id
        });
        setState({
          selectedAssets: Array.isArray(profile.selected_assets) 
            ? (profile.selected_assets as string[]) 
            : [],
          currentAssetId: profile.current_asset_id,
        });
      }
      setIsLoaded(true);
    };

    loadState();
  }, []);

  // Save selected assets to database
  const saveSelectedAssets = async (assetIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('[PersistentState] Salvando ativos selecionados:', assetIds);

    setState(prev => ({ ...prev, selectedAssets: assetIds }));

    const { error } = await supabase
      .from('profiles')
      .update({ selected_assets: assetIds })
      .eq('user_id', user.id);

    if (error) {
      console.error('[PersistentState] Erro ao salvar ativos:', error);
    } else {
      console.log('[PersistentState] Ativos salvos com sucesso');
    }
  };

  // Save current asset to database
  const saveCurrentAsset = async (assetId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('[PersistentState] Salvando ativo atual:', assetId);

    setState(prev => ({ ...prev, currentAssetId: assetId }));

    const { error } = await supabase
      .from('profiles')
      .update({ current_asset_id: assetId })
      .eq('user_id', user.id);

    if (error) {
      console.error('[PersistentState] Erro ao salvar ativo atual:', error);
    } else {
      console.log('[PersistentState] Ativo atual salvo com sucesso');
    }
  };

  return {
    ...state,
    isLoaded,
    saveSelectedAssets,
    saveCurrentAsset,
  };
}
