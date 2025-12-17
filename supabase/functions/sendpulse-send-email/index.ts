import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}

interface CampaignRequest {
  subject: string;
  html: string;
  fromName?: string;
}

// Get SendPulse access token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("SENDPULSE_API_USER_ID");
  const clientSecret = Deno.env.get("SENDPULSE_API_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("SendPulse credentials not configured");
  }

  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SendPulse auth error:", error);
    throw new Error("Failed to authenticate with SendPulse");
  }

  const data = await response.json();
  return data.access_token;
}

// Send single email via SMTP
async function sendEmail(token: string, request: SendEmailRequest): Promise<any> {
  const emails = Array.isArray(request.to) ? request.to : [request.to];
  
  const emailData = {
    email: {
      html: request.html,
      text: request.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      subject: request.subject,
      from: {
        name: request.fromName || "Forex Oficial",
        email: request.fromEmail || Deno.env.get("SENDPULSE_FROM_EMAIL") || "noreply@forexoficial.com",
      },
      to: emails.map(email => ({ email })),
    },
  };

  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SendPulse send error:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

// Send campaign to all users
async function sendCampaign(token: string, request: CampaignRequest): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all user emails
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email")
    .not("email", "is", null);

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch user emails");
  }

  const emails = profiles
    .map(p => p.email)
    .filter((email): email is string => !!email && email.length > 0);

  if (emails.length === 0) {
    return { success: true, message: "No users to send to", sent: 0 };
  }

  console.log(`Sending campaign to ${emails.length} users`);

  // Send in batches of 50 to avoid rate limits
  const batchSize = 50;
  let totalSent = 0;
  const errors: string[] = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    try {
      await sendEmail(token, {
        to: batch,
        subject: request.subject,
        html: request.html,
        fromName: request.fromName,
      });
      totalSent += batch.length;
      console.log(`Batch sent: ${totalSent}/${emails.length}`);
    } catch (err: any) {
      console.error(`Batch error:`, err);
      errors.push(`Batch ${i}-${i + batchSize}: ${err?.message || 'Unknown error'}`);
    }

    // Small delay between batches
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    success: true,
    sent: totalSent,
    total: emails.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const token = await getAccessToken();

    let result;

    switch (action) {
      case "send":
        // Send single email
        result = await sendEmail(token, params as SendEmailRequest);
        break;

      case "campaign":
        // Send campaign to all users
        result = await sendCampaign(token, params as CampaignRequest);
        break;

      case "welcome":
        // Send welcome email to new user
        const { email, name } = params;
        result = await sendEmail(token, {
          to: email,
          subject: "Bem-vindo à Forex Oficial! 🎉",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .header h1 { color: white; margin: 0; font-size: 28px; }
                .content { background: #1a1a2e; padding: 30px; color: #fff; }
                .content h2 { color: #f59e0b; }
                .button { display: inline-block; background: #f59e0b; color: #000 !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { background: #0f0f1a; padding: 20px; text-align: center; color: #888; font-size: 12px; border-radius: 0 0 10px 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚀 Forex Oficial</h1>
                </div>
                <div class="content">
                  <h2>Olá${name ? `, ${name}` : ''}!</h2>
                  <p>Seja muito bem-vindo à <strong>maior corretora de Trading do mundo!</strong></p>
                  <p>Sua conta foi criada com sucesso. Agora você tem acesso a:</p>
                  <ul>
                    <li>✅ Gráficos profissionais em tempo real</li>
                    <li>✅ Múltiplos ativos para operar</li>
                    <li>✅ Conta demo para praticar</li>
                    <li>✅ Suporte 24/7</li>
                  </ul>
                  <p>Comece agora mesmo a explorar a plataforma:</p>
                  <a href="https://trade.forexoficial.com" class="button">Acessar Plataforma</a>
                  <p style="margin-top: 30px; color: #888;">Se tiver qualquer dúvida, nossa equipe está pronta para ajudar!</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Forex Oficial. Todos os direitos reservados.</p>
                  <p>Este email foi enviado porque você se cadastrou em nossa plataforma.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("SendPulse error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
