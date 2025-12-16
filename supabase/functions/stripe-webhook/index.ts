import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err?.message || String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Parse without verification (for development)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification");
    }

    logStep("Event type", { type: event.type });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment succeeded", { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          userId: paymentIntent.metadata.supabase_user_id,
        });

        // Update transaction status
        const { data: transaction, error: updateError } = await supabase
          .from("transactions")
          .update({ 
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("transaction_reference", paymentIntent.id)
          .select()
          .single();

        if (updateError) {
          logStep("Error updating transaction", { error: updateError.message });
        } else {
          logStep("Transaction updated to completed", { transactionId: transaction.id });

          // Update user balance
          const userId = paymentIntent.metadata.supabase_user_id;
          const amount = paymentIntent.amount / 100; // Convert from cents

          if (!userId) {
            logStep("No user ID in metadata, skipping balance update");
            break;
          }

          // Get current profile
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("balance, total_deposited")
            .eq("user_id", userId)
            .single();

          if (profileError) {
            logStep("Error fetching profile", { error: profileError.message });
            break;
          }

          if (profile) {
            const currentBalance = Number(profile.balance) || 0;
            const currentTotalDeposited = Number(profile.total_deposited) || 0;
            const newBalance = currentBalance + amount;
            const newTotalDeposited = currentTotalDeposited + amount;

            // Calculate user tier based on total deposited
            let userTier = 'standard';
            if (newTotalDeposited >= 1000000) {
              userTier = 'vip';
            } else if (newTotalDeposited >= 100000) {
              userTier = 'pro';
            }

            const { error: updateBalanceError } = await supabase
              .from("profiles")
              .update({
                balance: newBalance,
                total_deposited: newTotalDeposited,
                user_tier: userTier,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);

            if (updateBalanceError) {
              logStep("Error updating balance", { error: updateBalanceError.message });
            } else {
              logStep("Balance updated successfully", { 
                userId, 
                previousBalance: currentBalance,
                newBalance, 
                depositAmount: amount,
                newTotalDeposited,
                userTier
              });
            }
          } else {
            logStep("Profile not found for user", { userId });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment failed", { 
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
        });

        // Update transaction status
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ 
            status: "failed",
            notes: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
            updated_at: new Date().toISOString(),
          })
          .eq("transaction_reference", paymentIntent.id);

        if (updateError) {
          logStep("Error updating transaction", { error: updateError.message });
        }
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment canceled", { paymentIntentId: paymentIntent.id });

        const { error: updateError } = await supabase
          .from("transactions")
          .update({ 
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("transaction_reference", paymentIntent.id);

        if (updateError) {
          logStep("Error updating transaction", { error: updateError.message });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
