import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 URL encoding/decoding utilities
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Create JWT for VAPID authentication
async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: subject
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Generate encryption keys for push payload
async function generateEncryptionKeys() {
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  
  return {
    localKeyPair,
    salt,
    localPublicKey: new Uint8Array(publicKeyBuffer)
  };
}

// Derive encryption key using ECDH
async function deriveEncryptionKey(
  localPrivateKey: CryptoKey,
  clientPublicKeyBytes: Uint8Array,
  authSecret: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Promise<{ contentEncryptionKey: Uint8Array; nonce: Uint8Array }> {
  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    localPrivateKey,
    256
  );

  // Create info for HKDF
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    ...clientPublicKeyBytes,
    ...localPublicKey
  ]);
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: nonce\0'),
    ...clientPublicKeyBytes,
    ...localPublicKey
  ]);

  // Import shared secret for HKDF
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(sharedSecret),
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive PRK using auth secret
  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret.buffer as ArrayBuffer, info: authInfo.buffer as ArrayBuffer },
    hkdfKey,
    256
  );

  const prkKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(prkBits),
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive content encryption key
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, info: keyInfo.buffer as ArrayBuffer },
    prkKey,
    128
  );

  // Derive nonce
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, info: nonceInfo.buffer as ArrayBuffer },
    prkKey,
    96
  );

  return {
    contentEncryptionKey: new Uint8Array(cekBits),
    nonce: new Uint8Array(nonceBits)
  };
}

// Encrypt the payload using AES-GCM
async function encryptPayload(
  payload: string,
  clientPublicKeyBytes: Uint8Array,
  authSecret: Uint8Array
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const { localKeyPair, salt, localPublicKey } = await generateEncryptionKeys();

  const { contentEncryptionKey, nonce } = await deriveEncryptionKey(
    localKeyPair.privateKey,
    clientPublicKeyBytes,
    authSecret,
    salt,
    localPublicKey
  );

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey.buffer as ArrayBuffer,
    'AES-GCM',
    false,
    ['encrypt']
  );

  // Add padding (required by Web Push)
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
    aesKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey
  };
}

// Build the encrypted body in aes128gcm format
function buildAes128gcmBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): ArrayBuffer {
  const recordSize = encrypted.length + 86;
  const body = new Uint8Array(86 + encrypted.length);
  
  body.set(salt, 0);
  
  const view = new DataView(body.buffer);
  view.setUint32(16, recordSize, false);
  
  body[20] = localPublicKey.length;
  body.set(localPublicKey, 21);
  body.set(encrypted, 86);
  
  return body.buffer;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, 'mailto:admin@platform.com', vapidPrivateKey);

    const clientPublicKey = base64UrlDecode(subscription.p256dh);
    const authSecret = base64UrlDecode(subscription.auth);

    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      clientPublicKey,
      authSecret
    );

    const body = buildAes128gcmBody(encrypted, salt, localPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        'Urgency': 'normal'
      },
      body: body
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      body, 
      icon, 
      url, 
      userId, 
      sendToAll = false,
      tag = 'platform-notification'
    } = await req.json();

    console.log('[Send Push] Request:', { title, userId, sendToAll });

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Send Push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured. Please generate and configure VAPID keys in the admin panel.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase.from('push_subscriptions').select('*');
    
    if (!sendToAll && userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: subscriptions, error: queryError } = await query;
    
    if (queryError) {
      console.error('[Send Push] Error fetching subscriptions:', queryError);
      throw queryError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Send Push] No subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Send Push] Sending to ${subscriptions.length} subscriptions`);

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: url || '/',
      tag,
      timestamp: Date.now()
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        sent++;
        console.log(`[Send Push] Success: ${sub.endpoint.substring(0, 50)}...`);
      } else {
        failed++;
        errors.push(result.error || 'Unknown error');
        console.error(`[Send Push] Failed:`, result.error);
        
        if (result.error?.includes('410') || result.error?.includes('404') || result.error?.includes('expired')) {
          console.log(`[Send Push] Removing invalid subscription`);
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    console.log(`[Send Push] Result: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: subscriptions.length, errors: errors.slice(0, 5) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Send Push] General error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
