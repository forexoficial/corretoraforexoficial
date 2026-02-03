import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-openpix-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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
      const body = await req.json();
      console.log("Woovi webhook received:", JSON.stringify(body));

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

      if (!correlationID) {
        console.error("Missing correlationID in webhook payload");
        return new Response(JSON.stringify({ error: "Missing correlationID" }), {
          status: 200, // Return 200 to avoid retries
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Processing payment for correlationID: ${correlationID}`);

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Find the transaction by correlationID (stored in transaction_reference)
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("transaction_reference", correlationID)
        .eq("status", "pending")
        .single();

      if (fetchError || !transaction) {
        console.log(`Transaction not found or already processed: ${correlationID}`);
        // Return 200 to avoid retries - idempotency
        return new Response(JSON.stringify({ received: true, message: "Already processed or not found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update transaction to completed
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", transaction.id);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update transaction" }), {
          status: 200, // Return 200 to avoid infinite retries
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update user balance
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ 
          balance: supabase.rpc("", {}), // We'll use a raw query instead
        })
        .eq("user_id", transaction.user_id);

      // Use raw update for balance increment
      const { error: balanceUpdateError } = await supabase.rpc("increment_balance", {
        p_user_id: transaction.user_id,
        p_amount: transaction.amount
      });

      // If RPC doesn't exist, do a direct update
      if (balanceUpdateError) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("user_id", transaction.user_id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ 
              balance: (profile.balance || 0) + transaction.amount,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", transaction.user_id);
        }
      }

      console.log(`Payment completed for user ${transaction.user_id}, amount: ${transaction.amount}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 200, // Return 200 to avoid infinite retries
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
