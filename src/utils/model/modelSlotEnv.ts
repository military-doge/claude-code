/**
 * Slot → (baseURL, apiKey) → process.env, the single gate that makes each
 * /model slot independent.
 *
 * The API layer reads `process.env.ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`
 * fresh on every request (see src/services/api/client.ts getAnthropicClient),
 * so pointing those at the currently-selected slot's values makes the whole
 * session — including spawned subagents, which inherit process.env — use that
 * slot's endpoint + credential.
 *
 * Which slot is "active" is decided by the selected engine string plus the
 * persisted slot index (settings.modelSlot). The index matters when several
 * slots share the same engine string (e.g. four deepseek-v4-flash slots): it
 * lets us restore the exact slot — and its own base URL / key — after restart.
 *
 * A slot credential is sent as `Authorization: Bearer` (ANTHROPIC_AUTH_TOKEN),
 * matching how the global DeepSeek config already authenticates. When a slot
 * defines no base URL / key, the global .env values (snapshotted at module
 * load) are used.
 */
import { getConfiguredModelSlots, type ConfiguredModelSlot } from './modelSlots.js'
import {
  getSettings_DEPRECATED,
  updateSettingsForSource,
} from '../settings/settings.js'

// Global defaults snapshotted once. .env is loaded by the bun --env-file
// launcher before any module evaluates, so these reflect the .env values.
const globalBaseUrl = process.env.ANTHROPIC_BASE_URL ?? ''
const globalAuthToken = process.env.ANTHROPIC_AUTH_TOKEN ?? ''
const globalApiKey = process.env.ANTHROPIC_API_KEY ?? ''

/** Set an env var; delete it when the value is empty so falsy checks stay clean. */
function setEnvVar(key: string, value: string): void {
  if (value) {
    process.env[key] = value
  } else {
    delete process.env[key]
  }
}

/** Read the persisted slot index from user settings (settings.modelSlot). */
export function getPersistedSlotIndex(): number | null {
  const settings = getSettings_DEPRECATED() ?? {}
  const index = (settings as { modelSlot?: unknown }).modelSlot
  return typeof index === 'number' && Number.isInteger(index) ? index : null
}

function findSlotByIndex(
  index: number | null,
  engine?: string | null,
): ConfiguredModelSlot | null {
  if (index == null) {
    return null
  }
  const slot = getConfiguredModelSlots().find(s => s.index === index)
  if (!slot) {
    return null
  }
  if (engine != null && engine !== '' && slot.model !== engine) {
    return null
  }
  return slot
}

function findFirstSlotByModel(engine?: string | null): ConfiguredModelSlot | null {
  if (!engine) {
    return null
  }
  return getConfiguredModelSlots().find(s => s.model === engine) ?? null
}

/**
 * Resolve the slot that should be active for a given engine string.
 * Precedence: explicit index (fresh UI selection) → persisted slot index
 * (restart/restore) → first configured slot whose model equals the engine.
 * Returns null when the engine isn't backed by a configured slot.
 */
export function resolveActiveSlot(
  engine?: string | null,
  explicitIndex?: number | null,
): ConfiguredModelSlot | null {
  if (explicitIndex != null) {
    const slot = findSlotByIndex(explicitIndex, engine)
    if (slot) {
      return slot
    }
  }
  const persisted = getPersistedSlotIndex()
  if (persisted != null) {
    const slot = findSlotByIndex(persisted, engine)
    if (slot) {
      return slot
    }
  }
  return findFirstSlotByModel(engine)
}

/** Point process.env at a slot's base URL / credential, or back at the globals. */
export function applySlotEnv(slot: ConfiguredModelSlot | null): void {
  setEnvVar('ANTHROPIC_BASE_URL', slot?.baseUrl || globalBaseUrl)
  if (slot?.apiKey) {
    // Slot credential is a Bearer token (matches the DeepSeek /anthropic
    // endpoint and the global ANTHROPIC_AUTH_TOKEN setup).
    setEnvVar('ANTHROPIC_AUTH_TOKEN', slot.apiKey)
    delete process.env.ANTHROPIC_API_KEY
  } else {
    // No slot credential → revert to the global auth env (Bearer or x-api-key).
    setEnvVar('ANTHROPIC_AUTH_TOKEN', globalAuthToken)
    setEnvVar('ANTHROPIC_API_KEY', globalApiKey)
  }
}

/**
 * Apply the active slot's env for an engine string and return the slot index
 * that was applied (null when reverting to global). Call after the model is
 * (re)selected or resolved so subsequent requests use the slot's own endpoint.
 */
export function ensureActiveSlotEnv(
  engine?: string | null,
  explicitIndex?: number | null,
): number | null {
  const slot = resolveActiveSlot(engine, explicitIndex)
  applySlotEnv(slot)
  return slot?.index ?? null
}

/** Persist the active slot index; pass null/undefined to clear it. */
export function persistActiveModelSlot(index: number | null | undefined): void {
  updateSettingsForSource('userSettings', { modelSlot: index ?? undefined })
}

let persistedSlotEnvApplied = false

/**
 * One-time safety net for paths that never run the interactive picker or
 * startup hook (headless -p, session resume, MCP boot): before the first API
 * client is built, point process.env at the persisted slot for the persisted
 * engine. No-op once applied — interactive selection syncs env directly.
 */
export function ensurePersistedSlotEnvOnce(): void {
  if (persistedSlotEnvApplied) {
    return
  }
  persistedSlotEnvApplied = true
  const slots = getConfiguredModelSlots()
  if (slots.length === 0) {
    return
  }
  const settings = getSettings_DEPRECATED() ?? {}
  const settingsModel =
    typeof settings.model === 'string' && settings.model ? settings.model : null
  // No persisted model yet → slot 1 is the default engine, so use its creds.
  const engine = settingsModel ?? slots[0]!.model
  ensureActiveSlotEnv(engine)
}
