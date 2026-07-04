"use client";

import { getDisplayNamesByUserIds } from "@/services/userSettings";
import { useState } from "react";
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
import { Household, HouseholdInvite, HouseholdMember } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const household = await createHousehold(supabase, userId, newHouseholdName);
      setHouseholds((prev) => [...prev, household]);
      setNewHouseholdName("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (householdId: string) => {
    const email = inviteEmails[householdId];
    if (!email?.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await inviteMember(supabase, householdId, userId, email);
      setInviteEmails((prev) => ({ ...prev, [householdId]: "" }));
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.household.pendingInvites}
          </h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {invite.households?.name ?? "Household"}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => handleAcceptInvite(invite)} disabled={loading}>
                    {t.household.accept}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeclineInvite(invite.id)}
                    disabled={loading}
                  >
                    {t.household.decline}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create household */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t.household.createHousehold}
        </h2>
        <div className="flex gap-2">
          <Input
            label={t.household.householdName}
            value={newHouseholdName}
            onChange={(e) => setNewHouseholdName(e.target.value)}
            placeholder="e.g. Family Budget"
            className="flex-1"
          />
        </div>
        <div className="mt-3">
          <Button onClick={handleCreateHousehold} disabled={loading || !newHouseholdName.trim()}>
            {t.household.create}
          </Button>
        </div>
      </Card>

      {/* Existing households */}
      {households.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.household.noHouseholds}</p>
        </Card>
      ) : (
        households
          .filter((h) => h !== null && h !== undefined)
          .map((h) => (
            <Card key={h.id}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {h.name}
                </h2>
                {h.owner_id === userId && (
                  <button
                    onClick={() => setConfirmDeleteId(h.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    {t.household.deleteHousehold}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {h.owner_id === userId ? t.household.owner : t.household.member}
              </p>

              {confirmDeleteId === h.id && (
                <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4">
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    {t.household.deleteConfirm}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteHousehold(h.id)}
                      disabled={loading}
                    >
                      {t.household.confirmDelete}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={loading}
                    >
                      {t.household.cancel}
                    </Button>
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.household.members}
                  </h3>
                  <button
                    onClick={() => loadMembers(h.id)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {t.household.members}
                  </button>
                </div>

                {members[h.id] ? (
                  members[h.id].length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.household.noMembers}</p>
                  ) : (
                    <ul className="space-y-2">
                      {members[h.id].map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300"
                        >
                          <span>
                            {m.user_id === userId
                              ? t.household.you
                              : memberNames[m.user_id] || m.user_id.slice(0, 8)}
                            {" · "}
                            {m.role === "owner" ? t.household.owner : t.household.member}
                          </span>
                          {h.owner_id === userId && m.user_id !== userId && (
                            <button
                              onClick={() => handleRemoveMember(h.id, m.user_id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              {t.household.remove}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t.household.clickToLoad}
                  </p>
                )}
              </div>

              {/* Invite (owner only) */}
              {h.owner_id === userId && (
                <div className="flex gap-2 items-end">
                  <Input
                    label={t.household.inviteEmail}
                    type="email"
                    value={inviteEmails[h.id] ?? ""}
                    onChange={(e) =>
                      setInviteEmails((prev) => ({ ...prev, [h.id]: e.target.value }))
                    }
                    placeholder="email@example.com"
                    className="flex-1"
                  />
                  <Button onClick={() => handleInvite(h.id)} disabled={loading}>
                    {t.household.sendInvite}
                  </Button>
                </div>
              )}
            </Card>
          ))
      )}
    </div>
  );
}