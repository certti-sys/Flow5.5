import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

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
    const { data: atRiskUsers, error } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        current_streak,
        profiles (
          name,
          email,
          whatsapp
        )
      `)
      .eq('last_activity_date', yesterday)
      .eq('lessons_today', 0)
      .gt('current_streak', 0);

    if (error) throw error;

    logger.info(`Found ${atRiskUsers?.length || 0} users with streaks at risk.`);

    for (const record of (atRiskUsers || [])) {
      const profile = record.profiles as any;
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
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` 
          },
          body: JSON.stringify({
            to: profile.email,
            toName: profile.name,
            type: 'streak_at_risk',
            variables
          })
        }).catch(err => logger.error(`Email error for ${userId}`, err));
      }

      // Dispatch WhatsApp
      if (profile?.whatsapp) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` 
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
