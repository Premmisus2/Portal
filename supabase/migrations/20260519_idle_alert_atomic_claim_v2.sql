-- Replace v1 of claim_alert_slot with a version that returns the inserted
-- row's UUID (or NULL when cooldown blocks the claim). The previous
-- boolean-returning version forced the cron to PATCH "the most recent row"
-- via order+limit — and PostgREST ignores order/limit on PATCH, so every
-- historical row for that (type, recipient) was getting its channel
-- column rewritten on every send. Returning the row id lets the caller
-- PATCH by exact id and leaves audit history intact.

drop function if exists claim_alert_slot(text, text, int, text);

create or replace function claim_alert_slot(
  p_type text,
  p_recipient text,
  p_cooldown_minutes int,
  p_message text
)
returns text
language plpgsql
security definer
as $$
declare
  v_lock_key bigint;
  v_recent_exists boolean;
  v_new_id uuid;
begin
  v_lock_key := hashtextextended(p_type || ':' || p_recipient, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select exists (
    select 1
    from notifications_log
    where type = p_type
      and recipient = p_recipient
      and created_at > now() - (p_cooldown_minutes || ' minutes')::interval
  )
  into v_recent_exists;

  if v_recent_exists then
    return null;
  end if;

  insert into notifications_log (type, recipient, channel, message)
  values (p_type, p_recipient, 'pending', p_message)
  returning id into v_new_id;

  return v_new_id::text;
end;
$$;

revoke all on function claim_alert_slot(text, text, int, text) from public;
grant execute on function claim_alert_slot(text, text, int, text) to service_role;
