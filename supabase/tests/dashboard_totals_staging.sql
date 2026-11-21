-- GENERATED from tests/dashboardTotalsFixtures.mjs and frozen TS goldens.
-- Regenerate only this SQL: node tests/generate-dashboard-staging.mjs
-- STAGING ONLY; human-run, NOT executed by npm test or any migration.
-- psql -v ON_ERROR_STOP=1 -f <filled-copy-outside-repo.sql>
-- Uses BEGIN/ROLLBACK; on ANY failure ROLLBACK/close, do not continue.
-- Precreate via approved staging workflow, then replace ALL placeholders:
-- Three dedicated Auth users OWNER/MEMBER/OUTSIDER with NO transaction history;
-- HOUSEHOLD contains OWNER and MEMBER; OTHER_HOUSEHOLD contains OUTSIDER ONLY.
-- OWNER cannot see MEMBER personal rows or OTHER_HOUSEHOLD transactions.
-- OWNER owns RECURRING_BILL and TRAVEL_TRIP; provide CREDIT_CARD visible to OWNER
-- with at least 100 available, and approved categories if baseline FKs require them.
-- Copy baseline schema/RLS first; apply through 20261120130000 before testing.
-- Check extra baseline required columns/constraints against fixtures first.
-- In particular one legacy payment_method NULL is intentional (TS ?? cash).
-- If the actual baseline disallows that row, stop and document this case as
-- inapplicable pending a reviewed fixture adaptation; do not weaken constraints.
-- Fixed fixture transaction IDs must be unused. All inserts/temps roll back.
-- Test amount is canonical amount, NOT travel_amount_thb (intentionally 999).

begin;
set local search_path = '';
set local row_security = on;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

-- Operator creates exact fixtures; assertions below run as authenticated OWNER.
-- No Auth users, membership, policy or schema modifications are performed here.
create temporary table dashboard_fixtures on commit drop as
  select * from public.transactions with no data;
insert into pg_temp.dashboard_fixtures
select * from pg_catalog.jsonb_populate_recordset(null::public.transactions,
$seeds$
[
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000022",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-12-15",
    "amount": 30,
    "type": "expense",
    "category": "Bill",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": "<RECURRING_BILL_ID>",
    "recurring_occurrence_date": "2026-11-25",
    "title": "SQL fixture 22",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000006",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-16",
    "amount": 10,
    "type": "income",
    "category": "Salary",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 6",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000012",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-15",
    "amount": 8.75,
    "type": "expense",
    "category": "Food",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 12",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000005",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-15",
    "amount": 7.1,
    "type": "expense",
    "category": "Travel",
    "payment_method": "cash",
    "travel_trip_id": "<TRAVEL_TRIP_ID>",
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 5",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": 999,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000004",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-15",
    "amount": 5.25,
    "type": "expense",
    "category": "Food",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 4",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000013",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-14",
    "amount": 12,
    "type": "income",
    "category": "Salary",
    "payment_method": "bank_transfer",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 13",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000018",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-13",
    "amount": 0.3,
    "type": "expense",
    "category": "Delta",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 18",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000017",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-13",
    "amount": 0.3,
    "type": "expense",
    "category": "Gamma",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 17",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000016",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-13",
    "amount": 0.3,
    "type": "expense",
    "category": "Beta",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 16",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000015",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-13",
    "amount": 0.2,
    "type": "expense",
    "category": "Alpha",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 15",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000014",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-13",
    "amount": 0.1,
    "type": "expense",
    "category": "Alpha",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 14",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000024",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-12",
    "amount": 1,
    "type": "expense",
    "category": "Food",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 24",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000023",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-10",
    "amount": 2,
    "type": "expense",
    "category": "Bill",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": "<RECURRING_BILL_ID>",
    "recurring_occurrence_date": "2026-11-10",
    "title": "SQL fixture 23",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000010",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-04",
    "amount": 6,
    "type": "expense",
    "category": "Food",
    "payment_method": "credit_card",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 10",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": "<CREDIT_CARD_ID>",
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000009",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-03",
    "amount": 4,
    "type": "income",
    "category": "Salary",
    "payment_method": "bank_transfer",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 9",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000008",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-02",
    "amount": 3,
    "type": "expense",
    "category": "เติมเงินวอลเล็ต",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 8",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000020",
    "user_id": "<OUTSIDER_USER_ID>",
    "household_id": "<OTHER_HOUSEHOLD_ID>",
    "date": "2026-11-01",
    "amount": 8888,
    "type": "income",
    "category": "Hidden",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 20",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000019",
    "user_id": "<MEMBER_USER_ID>",
    "household_id": null,
    "date": "2026-11-01",
    "amount": 9999,
    "type": "income",
    "category": "Private",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 19",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000011",
    "user_id": "<OWNER_USER_ID>",
    "household_id": "<HOUSEHOLD_ID>",
    "date": "2026-11-01",
    "amount": 100,
    "type": "income",
    "category": "Salary",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 11",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000003",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-01",
    "amount": 0.2,
    "type": "income",
    "category": "Salary",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 3",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000002",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-11-01",
    "amount": 0.1,
    "type": "income",
    "category": "Salary",
    "payment_method": null,
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 2",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000007",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-10-31",
    "amount": 2,
    "type": "income",
    "category": "เติมเงินวอลเล็ต",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 7",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-09-30",
    "amount": 1000,
    "type": "income",
    "category": "Salary",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": null,
    "recurring_occurrence_date": null,
    "title": "SQL fixture 1",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  },
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-000000000021",
    "user_id": "<OWNER_USER_ID>",
    "household_id": null,
    "date": "2026-08-01",
    "amount": 20,
    "type": "expense",
    "category": "Bill",
    "payment_method": "cash",
    "travel_trip_id": null,
    "recurring_bill_id": "<RECURRING_BILL_ID>",
    "recurring_occurrence_date": "2026-11-20",
    "title": "SQL fixture 21",
    "created_at": "2026-11-01T00:00:00.000Z",
    "card_id": null,
    "travel_amount_thb": null,
    "title_id": null
  }
]
$seeds$::jsonb);
insert into pg_temp.dashboard_fixtures
select (pg_catalog.jsonb_populate_record(null::public.transactions,
  pg_catalog.to_jsonb(t) || pg_catalog.jsonb_build_object(
    'id', 'bbbbbbbb-bbbb-4bbb-8bbb-' || pg_catalog.lpad(n::text,12,'0'),
    'date','2026-10-15','amount',0.01,'type','expense','category','Micro'
  ))).*
from pg_temp.dashboard_fixtures as t cross join pg_catalog.generate_series(1,1005) as n
where t.id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'::uuid;

-- Refuse contaminated accounts, including invisible rows checked by operator.
do $preflight$
begin
  if exists(select 1 from public.transactions where user_id in
    ('<OWNER_USER_ID>'::uuid,'<MEMBER_USER_ID>'::uuid,'<OUTSIDER_USER_ID>'::uuid)) then
    raise exception 'Dedicated fixture accounts must have no transaction history';
  end if;
end;
$preflight$;
insert into public.transactions select * from pg_temp.dashboard_fixtures;

create temporary table dashboard_expected (name text, options jsonb, expected jsonb) on commit drop;
insert into pg_temp.dashboard_expected
select name,options,expected from pg_catalog.jsonb_to_recordset(
$goldens$
[
  {
    "name": "all",
    "options": {},
    "expected": {
      "cashBalance": 1019.95,
      "rangeCashBalance": 1019.95,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 1126.3,
        "totalExpense": 91.35,
        "balance": 1034.95,
        "transactionCount": 1025
      },
      "incomeCount": 7,
      "expenseCount": 1018,
      "accountCashBalance": 1033.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 21
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  },
  {
    "name": "range",
    "options": {
      "dateFrom": "2026-11-01",
      "dateTo": "2026-11-15"
    },
    "expected": {
      "cashBalance": 1019.95,
      "rangeCashBalance": 72,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 116.3,
        "totalExpense": 31.3,
        "balance": 85,
        "transactionCount": 16
      },
      "incomeCount": 5,
      "expenseCount": 11,
      "accountCashBalance": 1033.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 21
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  },
  {
    "name": "personal",
    "options": {
      "personalOnly": true,
      "userIds": [
        "<OWNER_USER_ID>"
      ],
      "dateFrom": "2026-11-01",
      "dateTo": "2026-11-15"
    },
    "expected": {
      "cashBalance": 929.9,
      "rangeCashBalance": -18.05,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 4.3,
        "totalExpense": 21.35,
        "balance": -17.05,
        "transactionCount": 8
      },
      "incomeCount": 3,
      "expenseCount": 5,
      "accountCashBalance": 933.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 12.25
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  },
  {
    "name": "household",
    "options": {
      "householdId": "<HOUSEHOLD_ID>",
      "dateFrom": "2026-11-01",
      "dateTo": "2026-11-15"
    },
    "expected": {
      "cashBalance": 90.05,
      "rangeCashBalance": 90.05,
      "personalCashBalance": 0,
      "kpis": {
        "totalIncome": 112,
        "totalExpense": 9.95,
        "balance": 102.05,
        "transactionCount": 8
      },
      "incomeCount": 2,
      "expenseCount": 6,
      "accountCashBalance": 100,
      "bankBalance": 0,
      "topCategories": [
        {
          "category": "Food",
          "amount": 8.75
        },
        {
          "category": "Alpha",
          "amount": 0.30000000000000004
        },
        {
          "category": "Delta",
          "amount": 0.3
        },
        {
          "category": "Gamma",
          "amount": 0.3
        }
      ]
    }
  },
  {
    "name": "member",
    "options": {
      "householdId": "<HOUSEHOLD_ID>",
      "userIds": [
        "<MEMBER_USER_ID>"
      ],
      "dateFrom": "2026-11-01",
      "dateTo": "2026-11-15"
    },
    "expected": {
      "cashBalance": -9.95,
      "rangeCashBalance": -9.95,
      "personalCashBalance": 0,
      "kpis": {
        "totalIncome": 12,
        "totalExpense": 9.95,
        "balance": 2.05,
        "transactionCount": 7
      },
      "incomeCount": 1,
      "expenseCount": 6,
      "accountCashBalance": 0,
      "bankBalance": 0,
      "topCategories": [
        {
          "category": "Food",
          "amount": 8.75
        },
        {
          "category": "Alpha",
          "amount": 0.30000000000000004
        },
        {
          "category": "Delta",
          "amount": 0.3
        },
        {
          "category": "Gamma",
          "amount": 0.3
        }
      ]
    }
  },
  {
    "name": "emptyMembers",
    "options": {
      "householdId": "<HOUSEHOLD_ID>",
      "userIds": []
    },
    "expected": {
      "cashBalance": 90.05,
      "rangeCashBalance": 90.05,
      "personalCashBalance": 0,
      "kpis": {
        "totalIncome": 112,
        "totalExpense": 9.95,
        "balance": 102.05,
        "transactionCount": 8
      },
      "incomeCount": 2,
      "expenseCount": 6,
      "accountCashBalance": 100,
      "bankBalance": 0,
      "topCategories": [
        {
          "category": "Food",
          "amount": 8.75
        },
        {
          "category": "Alpha",
          "amount": 0.30000000000000004
        },
        {
          "category": "Delta",
          "amount": 0.3
        },
        {
          "category": "Gamma",
          "amount": 0.3
        }
      ]
    }
  },
  {
    "name": "householdWins",
    "options": {
      "householdId": "<HOUSEHOLD_ID>",
      "personalOnly": true
    },
    "expected": {
      "cashBalance": 90.05,
      "rangeCashBalance": 90.05,
      "personalCashBalance": 0,
      "kpis": {
        "totalIncome": 112,
        "totalExpense": 9.95,
        "balance": 102.05,
        "transactionCount": 8
      },
      "incomeCount": 2,
      "expenseCount": 6,
      "accountCashBalance": 100,
      "bankBalance": 0,
      "topCategories": [
        {
          "category": "Food",
          "amount": 8.75
        },
        {
          "category": "Alpha",
          "amount": 0.30000000000000004
        },
        {
          "category": "Delta",
          "amount": 0.3
        },
        {
          "category": "Gamma",
          "amount": 0.3
        }
      ]
    }
  },
  {
    "name": "memberAcrossScopes",
    "options": {
      "userIds": [
        "<OWNER_USER_ID>"
      ]
    },
    "expected": {
      "cashBalance": 1029.9,
      "rangeCashBalance": 1029.9,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 1114.3,
        "totalExpense": 81.4,
        "balance": 1032.9,
        "transactionCount": 1018
      },
      "incomeCount": 6,
      "expenseCount": 1012,
      "accountCashBalance": 1033.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 12.25
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  },
  {
    "name": "emptyRange",
    "options": {
      "dateFrom": "2027-01-01",
      "dateTo": "2027-01-31"
    },
    "expected": {
      "cashBalance": 1019.95,
      "rangeCashBalance": 0,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 0,
        "totalExpense": 0,
        "balance": 0,
        "transactionCount": 0
      },
      "incomeCount": 0,
      "expenseCount": 0,
      "accountCashBalance": 1033.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 21
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  },
  {
    "name": "emptyScope",
    "options": {
      "householdId": "<OTHER_HOUSEHOLD_ID>"
    },
    "expected": {
      "cashBalance": 0,
      "rangeCashBalance": 0,
      "personalCashBalance": 0,
      "kpis": {
        "totalIncome": 0,
        "totalExpense": 0,
        "balance": 0,
        "transactionCount": 0
      },
      "incomeCount": 0,
      "expenseCount": 0,
      "accountCashBalance": 0,
      "bankBalance": 0,
      "topCategories": []
    }
  },
  {
    "name": "oneSided",
    "options": {
      "dateFrom": "2026-11-15"
    },
    "expected": {
      "cashBalance": 1019.95,
      "rangeCashBalance": -41.1,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 10,
        "totalExpense": 51.1,
        "balance": -41.1,
        "transactionCount": 5
      },
      "incomeCount": 1,
      "expenseCount": 4,
      "accountCashBalance": 1033.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 21
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  },
  {
    "name": "reverseRange",
    "options": {
      "dateFrom": "2026-11-16",
      "dateTo": "2026-11-01"
    },
    "expected": {
      "cashBalance": 1019.95,
      "rangeCashBalance": 0,
      "personalCashBalance": 929.9,
      "kpis": {
        "totalIncome": 0,
        "totalExpense": 0,
        "balance": 0,
        "transactionCount": 0
      },
      "incomeCount": 0,
      "expenseCount": 0,
      "accountCashBalance": 1033.9,
      "bankBalance": 4,
      "topCategories": [
        {
          "category": "Bill",
          "amount": 52
        },
        {
          "category": "Food",
          "amount": 21
        },
        {
          "category": "Micro",
          "amount": 10.04999999999983
        },
        {
          "category": "Travel",
          "amount": 7.1
        }
      ]
    }
  }
]
$goldens$::jsonb) as x(name text,options jsonb,expected jsonb);
grant select on pg_temp.dashboard_expected to authenticated;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claims','{"sub":"<OWNER_USER_ID>"}',true);

-- Expected: all twelve complete JSON comparisons match fixed TS reference numbers.
-- Includes >1000 visible rows, inclusive date edges, reversed/empty/one-sided
-- bounds, household precedence, member/all/personal scopes and exact category
-- first-seen/float tie ranking. No range filter ever narrows all-time cash.
do $assertions$
declare
  c record;
  r record;
  actual jsonb;
  users uuid[];
begin
  if pg_catalog.has_function_privilege('anon', 'public.get_dashboard_totals(uuid,boolean,uuid[],date,date,boolean)', 'execute') then
    raise exception 'anon must not execute dashboard totals';
  end if;
  for c in select * from pg_temp.dashboard_expected order by name loop
    select pg_catalog.array_agg(value::uuid) into users
      from pg_catalog.jsonb_array_elements_text(coalesce(c.options->'userIds','[]'::jsonb));
    select * into strict r from public.get_dashboard_totals(
      (c.options->>'householdId')::uuid,
      coalesce((c.options->>'personalOnly')::boolean,false), users,
      (c.options->>'dateFrom')::date,(c.options->>'dateTo')::date,true
    );
    actual := pg_catalog.jsonb_build_object(
      'cashBalance',r.cash_balance,'rangeCashBalance',r.range_cash_balance,
      'personalCashBalance',r.personal_cash_balance,
      'kpis',pg_catalog.jsonb_build_object('totalIncome',r.total_income,
        'totalExpense',r.total_expense,'balance',r.balance,'transactionCount',r.transaction_count),
      'incomeCount',r.income_count,'expenseCount',r.expense_count,
      'accountCashBalance',r.account_cash_balance,'bankBalance',r.bank_balance,
      'topCategories',r.top_categories);
    if actual is distinct from c.expected then
      raise exception 'Dashboard golden mismatch: % (inspect synthetic results locally)', c.name;
    end if;
    raise notice 'PASS dashboard golden: %', c.name;
  end loop;
  select * into strict r from public.get_dashboard_totals();
  if r.top_categories is distinct from '[]'::jsonb then
    raise exception 'Disabled category aggregation must return []';
  end if;
  raise notice 'PASS optional categories disabled';
end;
$assertions$;

reset role;
rollback;
-- Expected: 12 PASS golden notices plus disabled-category PASS; no retained rows.
-- RLS/auth/base schema and actual numeric/enum types must be verified here.
-- SQL/concurrency is NOT proven by offline TS tests; record result in staging guide.
