# Future money plans

Approved scope: a new menu on Mobile and Desktop; personal and household plans.

A plan records expected income, expected date, and allocations. Allocations refer to existing cards, goals, trips or categories, or a freely named purpose. They never create transactions, repay cards, or change goal balances. Users explicitly link an existing income, expense, or goal contribution. One actual record can belong to one allocation/plan, preventing double counting. Linking is reversible without deleting actual records.

Plan edits preserve allocation identifiers and linked actuals. Linked allocations cannot be removed; their planned amount may be reduced below actual usage with a visible warning. Archived plans retain their history. An optimistic revision prevents overwriting concurrent edits. Household plans and links are restricted to current members and matching household records; personal data remains private. All members can maintain their shared plans.

## Direction contract

THESIS: make the distinction between expected money, allocation, and actual money visible before any action.
OWN-WORLD: preserve the existing system typography, green accent, surface tokens, rounded controls, dark/light themes, shared slide-down selects and Genie dialogs.
STORY: name expected income, assign purposes, then connect actual records as they happen. No implied bank transfer or automatic category deduction.
FIRST VIEWPORT: title, personal/group filter, create action, then plan rows with expected date, expected amount, allocated and unallocated totals. Detail is a separate focused surface with allocation rows and actuals.
FORM: an extension of the existing finance app, with one responsive data model and Mobile/Desktop routes; seed: none (brief-pinned existing world).
FINISH: test calculation, create/edit/archive, linking/unlinking, concurrent edits, access scope, themes, mobile widths and deployed availability; keep fixtures out of deployment.
