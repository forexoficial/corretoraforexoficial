import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ativos principais que devem permanecer ativos (20 total)
    const mainAssets = [
      // Criptomoedas (7)
      'BTC-OTC', 'ETH-OTC', 'BNB-OTC', 'ADA-OTC', 'DOGE-OTC', 'LTC-OTC', 'SOL-OTC',
      // Ações (7)
      'AAPL', 'AMZN', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA',
      // Forex (4)
      'EUR-USD-OTC', 'GBP-USD-OTC', 'USD-JPY-OTC', 'AUD-USD-OTC',
      // Commodities (2)
      'XAU-OTC', 'WTI-OTC'
    ]

    // Desativar todos os ativos primeiro
    await supabaseClient
      .from('assets')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // Reativar apenas os principais
    await supabaseClient
      .from('assets')
      .update({ is_active: true })
      .in('symbol', mainAssets)

    // Atualizar ícones das criptomoedas para garantir que estão corretos
    const cryptoUpdates = [
      { symbol: 'BTC-OTC', icon_url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
      { symbol: 'ETH-OTC', icon_url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
      { symbol: 'BNB-OTC', icon_url: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
      { symbol: 'ADA-OTC', icon_url: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
      { symbol: 'DOGE-OTC', icon_url: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
      { symbol: 'LTC-OTC', icon_url: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' },
      { symbol: 'SOL-OTC', icon_url: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
    ]

    for (const update of cryptoUpdates) {
      await supabaseClient
        .from('assets')
        .update({ icon_url: update.icon_url })
        .eq('symbol', update.symbol)
    }

    // Contar quantos ativos ficaram ativos
    const { count } = await supabaseClient
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Ativos organizados com sucesso! ${count} ativos principais ativos.`,
        mainAssets: mainAssets
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
