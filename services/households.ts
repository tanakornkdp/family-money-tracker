import { SupabaseClient } from "@supabase/supabase-js";
import { Household, HouseholdMember, HouseholdInvite } from "@/types";

export async function getUserHouseholds(
  supabase: SupabaseClient
): Promise<Household[]> {
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Household[];
}

export async function createHousehold(
  supabase: SupabaseClient,
  ownerId: string,
  name: string
): Promise<Household> {
  const { data: household, error } = await supabase
    .from("households")
    .insert({ name: name.trim(), owner_id: ownerId })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: memberError } = await supabase
    .from("household_members")
    .insert({ household_id: household.id, user_id: ownerId, role: "owner" });

  if (memberError) throw new Error(memberError.message);

  return household as Household;
}

export async function getHouseholdMembers(
  supabase: SupabaseClient,
  householdId: string
): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as HouseholdMember[];
}

export async function inviteMember(
  supabase: SupabaseClient,
  householdId: string,
  invitedBy: string,
  email: string
): Promise<HouseholdInvite> {
  const { data, error } = await supabase
    .from("household_invites")
    .insert({ household_id: householdId, email: email.trim().toLowerCase(), invited_by: invitedBy })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as HouseholdInvite;
}

export async function getPendingInvitesForUser(
  supabase: SupabaseClient,
  email: string
): Promise<(HouseholdInvite & { households: Household })[]> {
  const { data, error } = await supabase
    .from("household_invites")
    .select("*, households(*)")
    .eq("email", email.toLowerCase())
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return data as (HouseholdInvite & { households: Household })[];
}

export async function acceptInvite(
  supabase: SupabaseClient,
  inviteId: string,
  householdId: string,
  userId: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from("household_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);

  if (updateError) throw new Error(updateError.message);

  const { error: memberError } = await supabase
    .from("household_members")
    .insert({ household_id: householdId, user_id: userId, role: "member" });

  if (memberError) throw new Error(memberError.message);
}

export async function declineInvite(
  supabase: SupabaseClient,
  inviteId: string
): Promise<void> {
  const { error } = await supabase
    .from("household_invites")
    .update({ status: "declined" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
}

export async function removeMember(
  supabase: SupabaseClient,
  householdId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteHousehold(
  supabase: SupabaseClient,
  householdId: string
): Promise<void> {
  const { error } = await supabase
    .from("households")
    .delete()
    .eq("id", householdId);

  if (error) throw new Error(error.message);
}