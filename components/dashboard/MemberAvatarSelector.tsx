"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface MemberOption {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isYou: boolean;
}

export default function MemberAvatarSelector({
  members,
  selectedMemberIds,
}: {
  members: MemberOption[];
  selectedMemberIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  if (members.length === 0) return null;

  const updateSelection = (newSelection: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSelection.length === 0 || newSelection.length === members.length) {
      params.delete("members");
    } else {
      params.set("members", newSelection.join(","));
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleMember = (userId: string) => {
    const isSelected = selectedMemberIds.includes(userId);
    let next: string[];

    if (selectedMemberIds.length === 0) {
      // currently "everyone" selected, clicking one isolates to that person
      next = [userId];
    } else if (isSelected) {
      next = selectedMemberIds.filter((id) => id !== userId);
    } else {
      next = [...selectedMemberIds, userId];
    }

    updateSelection(next);
  };

  const selectAll = () => {
    updateSelection([]);
  };

  const isEveryoneSelected = selectedMemberIds.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        onClick={selectAll}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium transition ${
            isEveryoneSelected
              ? "bg-primary-600 text-white ring-2 ring-primary-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
          }`}
        >
          {t.dashboard.allMembers.slice(0, 2)}
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {t.dashboard.allMembers}
        </span>
      </button>

      {members.map((m) => {
        const isSelected = selectedMemberIds.includes(m.userId);
        return (
          <button
            key={m.userId}
            onClick={() => toggleMember(m.userId)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div
              className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold transition ${
                isSelected
                  ? "ring-2 ring-primary-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                  : "opacity-50 group-hover:opacity-80"
              }`}
            >
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatarUrl}
                  alt={m.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[64px] truncate">
              {m.isYou ? t.household.you : m.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}