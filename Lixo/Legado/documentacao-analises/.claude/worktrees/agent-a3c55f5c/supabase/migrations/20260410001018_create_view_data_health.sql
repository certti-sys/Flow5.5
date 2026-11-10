-- Create view for data health audit
CREATE OR REPLACE VIEW public.view_data_health_audit AS
SELECT 
  wt.id as transaction_id,
  wt.user_id,
  wt.course_id,
  wt.customer_email,
  p.name as customer_name,
  p.whatsapp,
  c.title as course_name,
  wt.status as transaction_status,
  wt.event_type,
  wt.processed_at,
  CASE 
    WHEN LOWER(wt.status) IN ('approved', 'completed', 'processing') AND uca.id IS NULL THEN 'MISSING_ACCESS'
    WHEN LOWER(wt.status) IN ('refunded', 'cancelled', 'failed', 'chargeback') AND uca.id IS NOT NULL THEN 'UNAUTHORIZED_ACCESS'
    WHEN LOWER(wt.status) IN ('approved', 'completed', 'processing') AND uca.id IS NOT NULL AND p.whatsapp IS NULL THEN 'MISSING_WHATSAPP'
    ELSE 'HEALTHY'
  END as health_status,
  wt.platform_id,
  wp.display_name as platform_name
FROM webhook_transactions wt
LEFT JOIN user_course_access uca ON wt.user_id = uca.user_id AND wt.course_id = uca.course_id
LEFT JOIN courses c ON wt.course_id = c.id
LEFT JOIN profiles p ON wt.user_id = p.id
LEFT JOIN webhook_platforms wp ON wt.platform_id = wp.id
WHERE wt.user_id IS NOT NULL AND wt.course_id IS NOT NULL;

-- Set up permissions for the view
GRANT SELECT ON public.view_data_health_audit TO authenticated;
GRANT SELECT ON public.view_data_health_audit TO service_role;
