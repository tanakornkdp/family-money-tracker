import { cache } from "react";

export const CARD_BALANCES_RPC = Object.freeze({
  name: "get_card_balances",
  migration: "20261120090000_card_balances_and_expense_limits",
});

// RSC cache is render/request-local. Route handlers have no React cache context,
// but this repo creates a fresh Supabase client per API request; weak keys scope
// their diagnostics without retaining clients or suppressing later requests.
const renderReports = cache(() => new Set());
/** @type {WeakMap<object, Set<string>>} */
const clientReports = new WeakMap();
/** @type {WeakSet<Error>} */
const reportedErrors = new WeakSet();

export class DatabaseMigrationRequiredError extends Error {
  /** @param {{name: string, migration: string}} dependency */
  constructor(dependency) {
    super(`Database migration ${dependency.migration} has not been applied`);
    this.name = "DatabaseMigrationRequiredError";
    this.code = "DATABASE_MIGRATION_REQUIRED";
    this.migration = dependency.migration;
    this.rpc = dependency.name;
    // Do not attach the upstream cause/message/details: it can contain payloads.
  }
}

/** @param {unknown} error */
export function isMissingRpcError(error) {
  let candidate = error;
  for (let depth = 0; depth < 4 && candidate && typeof candidate === "object"; depth++) {
    if ("code" in candidate && (candidate.code === "PGRST202" || candidate.code === "42883")) return true;
    candidate = "cause" in candidate ? candidate.cause : null;
  }
  return false;
}

/** @param {unknown} error */
export function isReportedMigrationError(error) {
  let candidate = error;
  for (let depth = 0; depth < 4 && candidate && typeof candidate === "object"; depth++) {
    if (candidate instanceof DatabaseMigrationRequiredError && reportedErrors.has(candidate)) return true;
    candidate = "cause" in candidate ? candidate.cause : null;
  }
  return false;
}

/**
 * Dependencies must be internal constants, never request-supplied names/text.
 * A missing RPC always throws; it must never produce zero/partial balances.
 * @param {unknown} error
 * @param {{name: string, migration: string}} dependency
 * @param {object} requestClient
 */
export function throwIfMissingRpcMigration(error, dependency, requestClient) {
  if (!isMissingRpcError(error)) return;
  const diagnostic = new DatabaseMigrationRequiredError(dependency);
  if (typeof window === "undefined") {
    const render = renderReports();
    let client = clientReports.get(requestClient);
    if (!client) { client = new Set(); clientReports.set(requestClient, client); }
    const seen = render.has(dependency.migration) || client.has(dependency.migration);
    render.add(dependency.migration);
    client.add(dependency.migration);
    reportedErrors.add(diagnostic);
    if (!seen) console.error(diagnostic.message);
  }
  throw diagnostic;
}
