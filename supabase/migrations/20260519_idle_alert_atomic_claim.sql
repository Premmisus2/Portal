-- Atomic claim function for idle alerts.
-- Cron callers use this instead of read-check-then-insert so two overlapping
-- invocations cannot both fire the same alert. The advisory lock serializes
-- claims for a given (type, recipient) pair across concurrent connections.
--
-- Returns true if this caller claimed the slot (caller should now send the
-- SMS/Telegram). Returns false if a recent row already exists inside the
-- cooldown window (caller should skip — someone else already alerted).

create or replace function claim_alert_slot(
  p_type text,
  p_recipient text,
  p_cooldown_minutes int,
  p_message text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_lock_key bigint;
  v_recent_exists boolean;
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
    return false;
  end if;

  insert into notifications_log (type, recipient, channel, message)
  values (p_type, p_recipient, 'pending', p_message);

  return true;
end;
$$;

revoke all on function claim_alert_slot(text, text, int, text) from public;
grant execute on function claim_alert_slot(text, text, int, text) to service_role;
