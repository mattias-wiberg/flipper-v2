CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'old_order_cleanup', -- job name
  '*/10 * * * *',       -- every 10 minutes
  $$DELETE FROM public.orders WHERE created_at < NOW() - INTERVAL '60 minutes'$$
);