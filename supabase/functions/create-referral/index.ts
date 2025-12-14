import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, affiliateCode } = await req.json();

    if (!userId || !affiliateCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing referral for user ${userId} with code ${affiliateCode}`);

    // Validate affiliate code exists
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, is_active")
      .eq("affiliate_code", affiliateCode)
      .single();

    if (affiliateError || !affiliate) {
      console.error("Affiliate not found:", affiliateError);
      return new Response(
        JSON.stringify({ error: "Invalid affiliate code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!affiliate.is_active) {
      return new Response(
        JSON.stringify({ error: "Affiliate is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", userId)
      .single();

    if (existingReferral) {
      console.log("Referral already exists");
      return new Response(
        JSON.stringify({ success: true, message: "Referral already exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create referral
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: userId,
        status: "active",
      })
      .select()
      .single();

    if (referralError) {
      console.error("Error creating referral:", referralError);
      return new Response(
        JSON.stringify({ error: "Failed to create referral" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment total_referrals manually
    const { data: currentAffiliate } = await supabase
      .from("affiliates")
      .select("total_referrals")
      .eq("id", affiliate.id)
      .single();

    if (currentAffiliate) {
      const { error: updateError } = await supabase
        .from("affiliates")
        .update({
          total_referrals: (currentAffiliate.total_referrals || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", affiliate.id);

      if (updateError) {
        console.error("Error updating affiliate stats:", updateError);
      } else {
        console.log(`Updated affiliate ${affiliate.id} total_referrals to ${(currentAffiliate.total_referrals || 0) + 1}`);
      }
    }

    console.log("Referral created successfully:", referral);

    return new Response(
      JSON.stringify({ success: true, referral }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-referral function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
