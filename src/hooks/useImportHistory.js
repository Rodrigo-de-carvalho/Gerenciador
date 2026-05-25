/**
 * Persists CSV import batches in localStorage so the user can undo any past
 * import — even after closing the modal or refreshing the page.
 *
 * Schema (per entry):
 *  { id, timestamp, bank, bankLabel, count, txIds, undone, cardId }
 */

const MAX_ENTRIES = 30;
const TTL_DAYS    = 60; // keep for 60 days

function storageKey(userId) {
  return `cifra_imports_${userId}`;
}

function load(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    // Remove expired entries
    const cutoff = Date.now() - TTL_DAYS * 86400_000;
    return list.filter(e => new Date(e.timestamp).getTime() > cutoff);
  } catch {
    return [];
  }
}

function save(userId, list) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch { /* quota exceeded — ignore */ }
}

/** Add a new import batch entry. Called right after bulkAddTransactions succeeds. */
export function recordImport(userId, { bank, bankLabel, count, txIds, cardId }) {
  const list = load(userId);
  list.unshift({
    id:        `imp_${Date.now()}`,
    timestamp: new Date().toISOString(),
    bank,
    bankLabel,
    count,
    txIds,
    undone:    false,
    cardId:    cardId || null,
  });
  save(userId, list);
}

/** Mark an import as undone (called after bulkDeleteTransactions succeeds). */
export function markUndone(userId, importId) {
  const list = load(userId);
  save(userId, list.map(e => e.id === importId ? { ...e, undone: true, txIds: [] } : e));
}

/** Return the full import history for a user, newest first. */
export function getImportHistory(userId) {
  return load(userId);
}

/** Remove a specific entry from history. */
export function removeFromHistory(userId, importId) {
  const list = load(userId);
  save(userId, list.filter(e => e.id !== importId));
}
