import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { enqueueEmail } from "../_shared/email-queue.ts";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    logger.info("Starting retention cron check...");

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Find users whose streak is at risk:
    // 1. Last active was yesterday
    // 2. Haven't studied today yet
    // 3. Have a streak > 0
    //
    // Sem embed de `profiles`: `user_stats.user_id` referencia `auth.users`,
    // então o PostgREST não enxerga relação com `profiles` e o embed inteiro
    // respondia 500. Duas consultas resolvem.
    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('user_id, current_streak')
      .eq('last_activity_date', yesterday)
      .eq('lessons_today', 0)
      .gt('current_streak', 0);

    if (error) throw error;

    const atRiskUsers = stats ?? [];
    logger.info(`Found ${atRiskUsers.length} users with streaks at risk.`);

    if (atRiskUsers.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, whatsapp')
      .in('id', atRiskUsers.map((r) => r.user_id));

    if (profilesError) throw profilesError;

    const profilesById = new Map((profileRows ?? []).map((p) => [p.id, p]));

    for (const record of atRiskUsers) {
      const profile = profilesById.get(record.user_id);
      const userId = record.user_id;
      const streak = record.current_streak;

      if (!profile?.email && !profile?.whatsapp) continue;

      const variables = {
        user_name: profile?.name || 'Aluno',
        dias_ofensiva: String(streak),
        login_url: `${Deno.env.get('PLATFORM_URL') || ''}/login`
      };

      // Dispatch Email
      if (profile?.email) {
        await enqueueEmail(supabase, {
          to: profile.email,
          toName: profile.name,
          type: 'streak_at_risk',
          variables,
          source: 'retention-cron',
        });
      }

      // Dispatch WhatsApp
      if (profile?.whatsapp) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            phone: profile.whatsapp,
            templateKey: 'streak_at_risk',
            variables
          })
        }).catch(err => logger.error(`WhatsApp error for ${userId}`, err));
      }
    }

    return new Response(JSON.stringify({ success: true, processed: atRiskUsers?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error("Retention cron failed", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
