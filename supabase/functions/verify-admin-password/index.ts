import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { hashSync, compareSync, genSaltSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { password } = await req.json() as RequestBody;

    if (!password) {
      console.log('Password not provided');
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current password hash from database
    const { data: settingData, error: fetchError } = await supabaseClient
      .from('platform_settings')
      .select('value')
      .eq('key', 'admin_panel_password_hash')
      .single();

    if (fetchError) {
      console.error('Error fetching password hash:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let storedHash = settingData?.value;

    // If no hash exists, initialize it with the environment password
    if (!storedHash || storedHash === '') {
      const adminPassword = Deno.env.get('ADMIN_PANEL_PASSWORD');
      
      if (!adminPassword) {
        console.error('ADMIN_PANEL_PASSWORD not set');
        return new Response(
          JSON.stringify({ error: 'Admin password not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Initializing admin password hash...');

      // Generate salt and hash (using sync versions for Deno Deploy compatibility)
      const salt = genSaltSync(10);
      storedHash = hashSync(adminPassword, salt);

      // Store hash in database
      const { error: updateError } = await supabaseClient
        .from('platform_settings')
        .update({ value: storedHash })
        .eq('key', 'admin_panel_password_hash');

      if (updateError) {
        console.error('Error storing password hash:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to initialize password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Admin password hash initialized successfully');
    }

    // Verify password (using sync version for Deno Deploy compatibility)
    const isValid = compareSync(password, storedHash);

    if (isValid) {
      console.log('Admin password verified successfully');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Invalid admin password attempt');
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in verify-admin-password:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
