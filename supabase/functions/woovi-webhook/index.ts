import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-openpix-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// HMAC signature verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET request for Woovi webhook validation
  if (req.method === "GET") {
    console.log("Woovi webhook validation request received");
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle POST request for actual webhook events
  if (req.method === "POST") {
    try {
      const rawBody = await req.text();
      console.log("Woovi webhook received, raw body length:", rawBody.length);

      // Optional: Verify signature if webhook secret is configured
      const webhookSecret = Deno.env.get("WOOVI_WEBHOOK_SECRET");
      const signature = req.headers.get("x-openpix-signature");
      
      if (webhookSecret && signature) {
        const isValid = await verifySignature(rawBody, signature, webhookSecret);
        if (!isValid) {
          console.error("Invalid webhook signature");
          // Still return 200 to not reveal signature validation
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log("Webhook signature verified successfully");
      }

      const body = JSON.parse(rawBody);
      console.log("Woovi webhook parsed:", JSON.stringify(body));

      const event = body.event;

      // Only process charge completed events
      if (event !== "OPENPIX:CHARGE_COMPLETED") {
        console.log(`Ignoring event: ${event}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const charge = body.charge;
      const correlationID = charge?.correlationID;
      const pix = body.pix;

      if (!correlationID) {
        console.error("Missing correlationID in webhook payload");
        return new Response(JSON.stringify({ error: "Missing correlationID" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Processing payment for correlationID: ${correlationID}`);
      console.log(`Pix endToEndId: ${pix?.endToEndId}`);
      console.log(`Charge value: ${charge?.value}`);

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Find the transaction by correlationID
      // correlationID = transaction.id in our implementation
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", correlationID)
        .single();

      if (fetchError || !transaction) {
        // Try finding by transaction_reference as fallback
        const { data: txByRef, error: refError } = await supabase
          .from("transactions")
          .select("*")
          .eq("transaction_reference", correlationID)
          .single();

        if (refError || !txByRef) {
          console.log(`Transaction not found: ${correlationID}`);
          return new Response(JSON.stringify({ received: true, message: "Transaction not found" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Use the found transaction
        if (txByRef.status === "completed") {
          console.log(`Transaction already completed: ${correlationID}`);
          return new Response(JSON.stringify({ received: true, message: "Already processed" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Process this transaction
        return await processTransaction(supabase, txByRef, charge, pix, corsHeaders);
      }

      // Check if already processed (idempotency)
      if (transaction.status === "completed") {
        console.log(`Transaction already completed: ${correlationID}`);
        return new Response(JSON.stringify({ received: true, message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return await processTransaction(supabase, transaction, charge, pix, corsHeaders);

    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function processTransaction(
  supabase: any,
  transaction: any,
  charge: any,
  pix: any,
  corsHeaders: any
) {
  // Update transaction to completed
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ 
      status: "completed",
      updated_at: new Date().toISOString(),
      notes: JSON.stringify({
        ...(transaction.notes ? JSON.parse(transaction.notes) : {}),
        completed_at: new Date().toISOString(),
        pix_end_to_end_id: pix?.endToEndId,
        woovi_charge_value: charge?.value,
      }),
    })
    .eq("id", transaction.id);

  if (updateError) {
    console.error("Error updating transaction:", updateError);
    return new Response(JSON.stringify({ error: "Failed to update transaction" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Transaction ${transaction.id} marked as completed`);

  // Update user balance
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", transaction.user_id)
    .single();

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError);
    return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const newBalance = (profile.balance || 0) + transaction.amount;

  const { error: balanceError } = await supabase
    .from("profiles")
    .update({ 
      balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", transaction.user_id);

  if (balanceError) {
    console.error("Error updating balance:", balanceError);
    return new Response(JSON.stringify({ error: "Failed to update balance" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Payment completed for user ${transaction.user_id}, amount: ${transaction.amount}, new balance: ${newBalance}`);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
