"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  createHousehold,
  inviteMember,
  acceptInvite,
  declineInvite,
  removeMember,
  getHouseholdMembers,
  deleteHousehold,
} from "@/services/households";
import { getDisplayNamesByUserIds } from "@/services/userSettings";
import { Household, HouseholdInvite, HouseholdMember } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Portal from "@/components/ui/Portal";
import { UserPlus, Users, Trash2, Plus, X, Mail, CheckCircle, Shield, User } from "lucide-react";

export default function HouseholdManager({
  initialHouseholds,
  initialInvites,
  userId,
}: {
  initialHouseholds: Household[];
  initialInvites: (HouseholdInvite & { households: Household | null })[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
  const [invites, setInvites] = useState(initialInvites);
  const [members, setMembers] = useState<Record<string, HouseholdMember[]>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New states for modal management
  const [activeInviteHousehold, setActiveInviteHousehold] = useState<Household | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadMembers = async (householdId: string) => {
    try {
      const data = await getHouseholdMembers(supabase, householdId);
      const userIds = data.map((m) => m.user_id);
      const names = await getDisplayNamesByUserIds(supabase, userIds);
      setMembers((prev) => ({ ...prev, [householdId]: data }));
      setMemberNames((prev) => ({ ...prev, ...names }));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Pre-load members for all households on mount
  useEffect(() => {
    if (households && households.length > 0) {
      households.forEach((h) => {
        if (h && h.id) {
          loadMembers(h.id);
        }
      });
    }
  }, [households]);

  const handleOpenInviteModal = (h: Household) => {
    setActiveInviteHousehold(h);
    setInviteEmail("");
    setError(null);
    setSuccess(null);
    loadMembers(h.id);
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const household = await createHousehold(supabase, userId, newHouseholdName);
      setHouseholds((prev) => [...prev, household]);
      setNewHouseholdName("");
      setIsCreateOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInviteHousehold || !inviteEmail.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await inviteMember(supabase, activeInviteHousehold.id, userId, inviteEmail);
      setSuccess(t.auth?.resetSuccess || "ส่งคำเชิญเสร็จเรียบร้อยแล้ว!");
      setInviteEmail("");
      
      // Auto-refresh member list after a tiny delay
      setTimeout(() => {
        loadMembers(activeInviteHousehold.id);
      }, 500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (
    invite: HouseholdInvite & { households: Household | null }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const householdId = invite.household_id;

      if (!householdId || !userId) {
        throw new Error("Missing household_id or userId");
      }

      await acceptInvite(supabase, invite.id, householdId, userId);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));

      if (invite.households) {
        setHouseholds((prev) => [...prev, invite.households as Household]);
      }

      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setLoading(true);
    setError(null);

    try {
      await declineInvite(supabase, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (householdId: string, memberUserId: string) => {
    setLoading(true);
    setError(null);

    try {
      await removeMember(supabase, householdId, memberUserId);
      setMembers((prev) => ({
        ...prev,
        [householdId]: (prev[householdId] ?? []).filter((m) => m.user_id !== memberUserId),
      }));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHousehold = async (householdId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteHousehold(supabase, householdId);
      setHouseholds((prev) => prev.filter((h) => h.id !== householdId));
      setMembers((prev) => {
        const updated = { ...prev };
        delete updated[householdId];
        return updated;
      });
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <span className="font-semibold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Actions Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary-600" />
          {t.household.yourHouseholds}
        </h2>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t.household.createHousehold}
        </Button>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-950/40 bg-amber-50/30 dark:bg-amber-950/10">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t.household.pendingInvites} ({invites.length})
            </h2>
          </div>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {invite.households?.name ?? "Household"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Invited by {invite.invited_by === userId ? "You" : "Other Member"}
                  </p>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <Button
                    onClick={() => handleAcceptInvite(invite)}
                    disabled={loading}
                    className="py-1.5 px-3.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {t.household.accept}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeclineInvite(invite.id)}
                    disabled={loading}
                    className="py-1.5 px-3.5 text-xs"
                  >
                    {t.household.decline}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Existing households list */}
      {households.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.household.noHouseholds}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Create a family group to start sharing receipts, credit card limits, and planning a shared budget!
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {t.household.createHousehold}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {households
            .filter((h) => h !== null && h !== undefined)
            .map((h) => {
              const currentMembers = members[h.id] || [];
              const isOwner = h.owner_id === userId;

              return (
                <Card
                  key={h.id}
                  className="relative flex flex-col justify-between transition-all hover:shadow-md border border-slate-100 dark:border-slate-800"
                >
                  <div>
                    {/* Header with Group Name */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-600">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {h.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isOwner ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <Shield className="h-3 w-3" />
                                {t.household.owner}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-500">
                                <User className="h-3 w-3" />
                                {t.household.member}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => setConfirmDeleteId(h.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title={t.household.deleteHousehold}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Delete Confirm Overlay */}
                    {confirmDeleteId === h.id && (
                      <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-4">
                        <p className="text-xs text-red-700 dark:text-red-400 mb-3 font-medium">
                          {t.household.deleteConfirm}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            onClick={() => handleDeleteHousehold(h.id)}
                            disabled={loading}
                            className="py-1.5 px-3.5 text-xs"
                          >
                            {t.household.confirmDelete}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={loading}
                            className="py-1.5 px-3.5 text-xs"
                          >
                            {t.household.cancel}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Quick Members Avatar Preview */}
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                        {t.household.members} ({currentMembers.length})
                      </h4>
                      {currentMembers.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Loading members...
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {currentMembers.map((m) => {
                            const fullName = memberNames[m.user_id];
                            const isCurrent = m.user_id === userId;
                            const name = fullName
                              ? (isCurrent ? `${fullName} (${t.household.you})` : fullName)
                              : (isCurrent ? t.household.you : m.user_id.slice(0, 8));
                            const initials = getInitials(fullName || (isCurrent ? t.household.you : m.user_id));
                            return (
                              <div
                                key={m.id}
                                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
                                title={name}
                              >
                                <div className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-950/80 text-[10px] font-bold text-primary-700 dark:text-primary-300 flex items-center justify-center">
                                  {initials}
                                </div>
                                <span>{name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Members Manage Dialog Button */}
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <Button
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2 h-10 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => handleOpenInviteModal(h)}
                    >
                      <UserPlus className="h-4 w-4 text-slate-500" />
                      {t.household.invite}
                    </Button>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {/* ============================================================================== */}
      {/* 1. DIALOG: CREATE NEW HOUSEHOLD */}
      {/* ============================================================================== */}
      {isCreateOpen && (
        <Modal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title={t.household.createHousehold}
        >
          <form onSubmit={handleCreateHousehold} className="space-y-4 mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create a group workspace for shared billing, budget calendars, and family tracking.
            </p>
            <Input
              label={t.household.householdName}
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.target.value)}
              placeholder="e.g. Family Budget, Roommates"
              required
              disabled={loading}
              className="mt-1"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={loading}
              >
                {t.household.cancel}
              </Button>
              <Button type="submit" disabled={loading || !newHouseholdName.trim()}>
                {loading ? "Creating..." : t.household.create}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================================== */}
      {/* 2. DIALOG: MANAGE & INVITE MEMBERS (STYLING DESIGNED EXACTLY LIKE REQUESTED) */}
      {/* ============================================================================== */}
      {activeInviteHousehold && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setActiveInviteHousehold(null)} />
            
            <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary-600" />
                  {t.household.invite} ({activeInviteHousehold.name})
                </h3>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
                  Add new members to your household workspace. Family members can log shared transactions, use joint credit cards, and contribute to budget plans.
                </p>
              </div>
              <button
                onClick={() => setActiveInviteHousehold(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error / Success Notifications */}
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-xs text-red-600 dark:text-red-400 mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 p-3 text-xs text-green-600 dark:text-green-400 mb-4 flex items-center gap-1.5 font-medium">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {success}
              </div>
            )}

            {/* Invite Email Form (Owner Only) */}
            {activeInviteHousehold.owner_id === userId ? (
              <form onSubmit={handleInvite} className="mb-6">
                <div className="flex w-full items-end gap-3">
                  <div className="relative flex-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      {t.household.inviteEmail}
                    </label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        id="inviteEmail"
                        className="h-10 pl-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
                        placeholder="Add email address..."
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="h-10 px-5 font-semibold" disabled={loading || !inviteEmail.trim()}>
                    {loading ? "Sending..." : t.household.sendInvite}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400 mb-6 text-center">
                Only the household owner can invite new members.
              </div>
            )}

            {/* Existing Members */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                People with existing access
              </h4>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[300px] overflow-y-auto pr-1">
                {(members[activeInviteHousehold.id] || []).map((member) => {
                  const isCurrent = member.user_id === userId;
                  const fullName = memberNames[member.user_id];
                  const name = fullName
                    ? (isCurrent ? `${fullName} (${t.household.you})` : fullName)
                    : (isCurrent ? `${t.household.you} (${userId.slice(0, 5)})` : member.user_id.slice(0, 8));
                  const initials = getInitials(fullName || (isCurrent ? t.household.you : member.user_id));
                  const isOwnerRole = member.role === "owner";

                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center space-x-3">
                        {/* Beautiful Avatar */}
                        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Badges */}
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            isOwnerRole
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
                          }`}
                        >
                          {isOwnerRole ? t.household.owner : t.household.member}
                        </span>

                        {/* Remove Member Button (Owner only, cannot remove self) */}
                        {activeInviteHousehold.owner_id === userId && !isCurrent && (
                          <button
                            onClick={() => handleRemoveMember(activeInviteHousehold.id, member.user_id)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title={t.household.remove}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Close Button */}
            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
              <Button variant="secondary" onClick={() => setActiveInviteHousehold(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Portal>
    )}
    </div>
  );
}
