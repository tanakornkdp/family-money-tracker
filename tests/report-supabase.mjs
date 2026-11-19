import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { financeDemo } from "./finance-demo.mjs";
import { mergeFinanceBackup } from "./merge-finance-backup.mjs";

const id = "10000000-0000-4000-8000-000000000001";
const member = "10000000-0000-4000-8000-000000000002";
const group = "10000000-0000-4000-8000-000000000003";
const user = { id, email: "report@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" };
const token = ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify({ sub: id, exp: 2147483647, role: "authenticated" })).toString("base64url"), "test"].join(".");
const expense = (id, date, category, amount, user_id, household_id) => ({ id, title: id, date, category, amount, user_id, household_id, type: "expense", payment_method: "cash" });
const rows = {
  user_settings: [{ user_id: id, language: "en", currency: "THB" }],
  households: [{ id: group, name: "Test family", owner_id: id }],
  household_members: [{ household_id: group, user_id: id, display_name: "Owner" }, { household_id: group, user_id: member, display_name: "Guest" }],
  categories: [{ name: "Food", type: "expense" }, { name: "Travel", type: "expense" }],
  transactions: [
    expense("meal", "2026-11-02", "Food", 120, id, null),
    expense("train", "2026-11-05", "Travel", 300, id, null),
    { ...expense("salary", "2026-11-08", "Salary", 800, id, null), type: "income", payment_method: "bank_transfer" },
    expense("group-meal", "2026-11-06", "Food", 150, member, group),
    expense("group-train", "2026-11-07", "Travel", 250, id, group),
  ],
};

if (process.env.FINANCE_DEMO === "1") {
  Object.assign(rows, financeDemo(id, member, group));
  if (process.env.FINANCE_DEMO_BACKUP) mergeFinanceBackup(rows, process.env.FINANCE_DEMO_BACKUP, id);
  rows.user_settings[0].language = "th";
  rows.households[0].name = "ครอบครัวเดโม";
  rows.household_members[0].display_name = "เจ้าของบัญชี";
  rows.household_members[1].display_name = "สมาชิกเดโม";
  const date = "2026-11-15T08:00:00Z";
  rows.budget_plans = [{ id: "demo-food-plan", user_id: id, household_id: null, name: "งบอาหารเดโม", total_amount: 4000, category: "อาหาร", start_date: "2026-11-01", end_date: "2026-11-30", alert_thresholds: [75], created_at: date }];
  rows.user_notifications = [
    { id: "demo-budget", user_id: id, kind: "budget", dedupe_key: "budget:demo-food-plan:threshold:75", title: "งบอาหารถึง 75%", detail: "เปิดงบอาหารเพื่อดูยอดและปรับระดับเตือน", created_at: date, read_at: null },
    { id: "demo-bill", user_id: id, kind: "bill", dedupe_key: "demo-bill", title: "บิลอินเทอร์เน็ตใกล้ครบกำหนด", detail: "18 พ.ย. · 699 บาท", created_at: date, read_at: null },
  ];
  rows.receipts = [{ id: "demo-receipt", user_id: id, status: "pending", parsed_merchant: "ร้านกาแฟเดโม", parsed_amount: 95, parsed_date: "2026-11-15", transaction_id: null, created_at: date }];
  rows.trip_transfers = [{ id: "demo-transfer", recipient: id, sender: member, trip_name: "เที่ยวโตเกียว", amount: 500, created_at: date, confirmed_at: null }];
  const original = rows.transactions.find(row => row.id === "nov-0");
  if (original) rows.transactions.push({ ...original, id: "demo-duplicate" });
  if (process.env.FINANCE_DEMO_STATE_FILE) {
    Object.assign(rows, JSON.parse(await readFile(process.env.FINANCE_DEMO_STATE_FILE, "utf8")));
  }
}

const avatarFiles = new Map();
for (const table of ["future_money_plans", "future_money_plan_links", "future_money_plan_events", "goal_contributions"]) rows[table] ??= [];
createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", request.headers["access-control-request-headers"] ?? "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PATCH,DELETE,OPTIONS");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") return response.end();
  const send = value => response.end(JSON.stringify(value));
  if (process.env.FINANCE_DEMO === "1" && url.pathname.startsWith("/storage/v1/object/")) {
    const path = url.pathname.replace(/^\/storage\/v1\/object\/(public\/)?/, "");
    if (request.method === "POST" && path.startsWith(`avatars/${id}/`)) {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(request.headers["content-type"] ?? "");
      const marker = boundary?.[1] ?? boundary?.[2];
      if (!marker) { response.statusCode = 400; return send({ message: "Missing upload boundary" }); }
      const parts = body.toString("latin1").split(`--${marker}`);
      const part = parts.find(value => /filename=/.test(value));
      if (!part) { response.statusCode = 400; return send({ message: "Missing image" }); }
      const split = part.indexOf("\r\n\r\n");
      avatarFiles.set(path, { body: Buffer.from(part.slice(split + 4, -2), "latin1"), type: /Content-Type: ([^\r\n]+)/i.exec(part)?.[1] ?? "image/jpeg" });
      return send({ Key: path, Id: randomUUID() });
    }
    const file = avatarFiles.get(path);
    if (file) { response.setHeader("Content-Type", file.type); return response.end(file.body); }
    response.statusCode = 404;
    return send({ message: "Image not found" });
  }
  if (url.pathname === "/auth/v1/signup") return send({ user });
  if (url.pathname === "/auth/v1/token") return send({ access_token: token, refresh_token: "mock-refresh", expires_in: 3600, token_type: "bearer", user });
  if (url.pathname === "/auth/v1/user") return send(user);
  const table = url.pathname.split("/").at(-1);
  if (process.env.FINANCE_DEMO === "1" && request.method === "POST" && url.pathname === "/rest/v1/rpc/rename_category") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const values = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const category = rows.categories.find(row => row.user_id === values.p_user_id && row.name === values.p_old_name);
    if (!category) { response.statusCode = 404; return send({ message: "Category not found" }); }
    Object.assign(category, { name: values.p_new_name, icon: values.p_new_icon });
    for (const name of ["transactions", "transaction_titles", "recurring_bills"]) {
      for (const row of rows[name] ?? []) {
        if (row.user_id === values.p_user_id && row.category === values.p_old_name) row.category = values.p_new_name;
      }
    }
    return send(null);
  }
  if (process.env.FINANCE_DEMO === "1" && url.pathname === "/rest/v1/rpc/confirm_trip_transfer") {
    rows.trip_transfers[0].confirmed_at = new Date().toISOString();
    return send(null);
  }
  const result = (rows[table] ?? []).filter(row => [...url.searchParams].every(([key, value]) => {
    if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
    if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
    if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(String(row[key]));
    if (value === "is.null") return row[key] == null;
    if (value.startsWith("gte.")) return row[key] >= value.slice(4);
    if (value.startsWith("lte.")) return row[key] <= value.slice(4);
    return true;
  }));
  if (process.env.FINANCE_DEMO === "1" && ["future_money_plans", "future_money_plan_links"].includes(table) && ["POST", "PATCH", "DELETE"].includes(request.method)) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const values = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    let record;
    if (request.method === "POST") {
      if (table.endsWith("links") && rows[table].some(row => (values.transaction_id && row.transaction_id === values.transaction_id) || (values.contribution_id && row.contribution_id === values.contribution_id))) { response.statusCode = 409; return send({ code: "23505", message: "Already linked" }); }
      record = { ...values, id: randomUUID(), revision: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      rows[table].push(record);
    } else if (request.method === "PATCH") {
      record = result[0];
      if (record) Object.assign(record, values, { revision: record.revision + 1, updated_at: new Date().toISOString() });
    } else {
      record = result[0];
      rows[table] = rows[table].filter(row => !result.includes(row));
    }
    if (record) rows.future_money_plan_events.unshift({ id: randomUUID(), plan_id: table.endsWith("links") ? record.plan_id : record.id, user_id: id, action: `${table}:${request.method === "POST" ? "INSERT" : request.method === "PATCH" ? "UPDATE" : "DELETE"}`, snapshot: structuredClone(record), created_at: new Date().toISOString() });
    return send(record ?? null);
  }
  if (process.env.FINANCE_DEMO === "1" && request.method === "DELETE" && table === "credit_cards") {
    rows.credit_cards = rows.credit_cards.filter(row => !result.includes(row));
    const deleted = new Set(result.map(row => row.id));
    for (const transaction of rows.transactions) {
      if (deleted.has(transaction.card_id)) transaction.card_id = null;
    }
    return send(null);
  }
  if (process.env.FINANCE_DEMO === "1" && ((request.method === "PATCH" && ["user_notifications", "budget_plans", "receipts", "credit_cards"].includes(table)) || (request.method === "POST" && ["transactions", "user_settings", "categories", "credit_cards", "account_reconciliations"].includes(table)))) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    let values;
    try { values = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { response.statusCode = 400; return send({ message: "Invalid fixture request" }); }
    if (request.method === "PATCH") result.forEach(row => Object.assign(row, values));
    else if (table === "user_settings") {
      const settings = rows.user_settings[0];
      Object.assign(settings, { ...values, user_id: id });
      result.splice(0, result.length, settings);
    } else if (table === "account_reconciliations") {
      const accounts = rows.account_reconciliations ??= [];
      const existing = accounts.find(row => row.user_id === values.user_id && row.account_key === values.account_key);
      const row = existing ? Object.assign(existing, values) : { ...values, id: randomUUID() };
      if (!existing) accounts.push(row);
      result.splice(0, result.length, row);
    } else {
      const row = { ...values, id: randomUUID(), created_at: new Date().toISOString() };
      rows[table].push(row);
      result.splice(0, result.length, row);
    }
  }
  if (request.method === "HEAD" && request.headers.prefer?.includes("count=exact")) {
    response.setHeader("Content-Range", result.length ? `0-${result.length - 1}/${result.length}` : "*/0");
    return response.end();
  }
  const order = (url.searchParams.get("order") ?? "").split(",").filter(Boolean);
  result.sort((left, right) => {
    for (const field of order) {
      const [key, direction] = field.split(".");
      const comparison = String(left[key] ?? "").localeCompare(String(right[key] ?? ""));
      if (comparison) return direction === "desc" ? -comparison : comparison;
    }
    return 0;
  });
  return send(request.headers.accept?.includes("vnd.pgrst.object") ? result[0] ?? null : result);
}).listen(Number(process.env.FINANCE_FIXTURE_PORT ?? 3211), "localhost");
