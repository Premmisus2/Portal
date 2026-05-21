// getIcalStatus — fetch whether the rep has an iCal token (without exposing
// the hash). UI uses this to decide whether to show "Generate URL" vs
// "Regenerate URL" (the unhashed token is never recoverable after the
// initial reveal).

import { supabase } from '@/lib/supabase';

export interface IcalStatus {
  hasToken: boolean;
  rotatedAt: string | null;
}

export async function getIcalStatus(repId: string): Promise<IcalStatus> {
  const { data, error } = await supabase
    .from('reps')
    .select('ical_token, ical_token_rotated_at')
    .eq('id', repId)
    .single();

  if (error) throw new Error(`Could not load iCal status: ${error.message}`);

  return {
    hasToken: !!data?.ical_token,
    rotatedAt: data?.ical_token_rotated_at ?? null,
  };
}
