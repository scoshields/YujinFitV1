import { supabase } from '../lib/supabase';

export async function searchUsers(query: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users')
    .select('id, name, username')
    .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
    .neq('id', user.id)
    .limit(10);

  if (error) throw error;
  return data;
}

export async function sendPartnerInvite(partnerId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check for existing invites
  const { data: existingInvites, error: checkError } = await supabase
    .from('workout_partners')
    .select('id, status')
    .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
    .eq('partner_id', partnerId);

  if (checkError) throw checkError;
  if (existingInvites?.length > 0) {
    throw new Error('A partnership already exists with this user');
  }

  const { data, error } = await supabase
    .from('workout_partners')
    .insert({
      user_id: user.id,
      partner_id: partnerId,
      status: 'pending'
    });

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('Invite already exists with this user');
    }
    throw error;
  }

  return data;
}

export async function getPartners() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get sent invites
  const { data: sentInvites, error: sentError } = await supabase
    .from('workout_partners')
    .select(`
      id,
      status,
      created_at,
      partner:users!workout_partners_partner_id_fkey (
        id,
        name,
        username
      )
    `)
    .eq('user_id', user.id);

  if (sentError) throw sentError;

  // Get received invites
  const { data: receivedInvites, error: receivedError } = await supabase
    .from('workout_partners')
    .select(`
      id,
      status,
      created_at,
      user:users!workout_partners_user_id_fkey (
        id,
        name,
        username
      )
    `)
    .eq('partner_id', user.id);

  if (receivedError) throw receivedError;

  return {
    sent: sentInvites || [],
    received: receivedInvites || []
  };
}

export async function respondToInvite(inviteId: string, status: 'accepted' | 'rejected') {
  const { data, error } = await supabase
    .from('workout_partners')
    .update({ status })
    .eq('id', inviteId);

  if (error) throw error;
  return data;
}

export async function getPartnerStats(partnerId: string) {
  const { data, error } = await supabase
    .from('weekly_workouts')
    .select(`
      *,
      daily_workouts (
        *,
        exercises (
          *,
          exercise_sets (*)
        )
      )
    `)
    .eq('user_id', partnerId)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function cancelInvite(inviteId: string) {
  const { error } = await supabase
    .from('workout_partners')
    .delete()
    .eq('id', inviteId);

  if (error) throw error;
}