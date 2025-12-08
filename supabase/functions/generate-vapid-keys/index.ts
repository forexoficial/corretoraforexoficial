import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  // Generate ECDSA key pair for P-256 curve
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export public key in raw format (uncompressed point)
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = base64UrlEncode(new Uint8Array(publicKeyRaw));

  // Export private key in PKCS8 format
  const privateKeyPkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBase64 = base64UrlEncode(new Uint8Array(privateKeyPkcs8));

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

// Base64 URL encoding (without padding)
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Generate VAPID Keys] Gerando novo par de chaves VAPID...');
    
    const keys = await generateVapidKeys();
    
    console.log('[Generate VAPID Keys] Chaves geradas com sucesso');
    console.log('[Generate VAPID Keys] Public Key length:', keys.publicKey.length);
    console.log('[Generate VAPID Keys] Private Key length:', keys.privateKey.length);

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        instructions: {
          pt: 'Copie estas chaves e atualize os secrets VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no Supabase.',
          en: 'Copy these keys and update the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets in Supabase.',
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    console.error('[Generate VAPID Keys] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate VAPID keys';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
