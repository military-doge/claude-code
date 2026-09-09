/**
 * Model slots with numbered providers, configured through environment
 * variables. Providers are declared once each (base URL + API key), and model
 * slots are written interleaved under their provider; slots are numbered
 * globally across providers and are attributed to the nearest preceding
 * provider block by .env FILE ORDER, which is recorded once at module load.
 *
 *   MODEL_PROVIDER_1_BASE_URL=https://api.deepseek.com/anthropic
 *   MODEL_PROVIDER_1_API_KEY=sk-...
 *   MODEL_SLOT_1_MODEL=deepseek-v4-pro
 *   MODEL_SLOT_1_DESCRIPTION=DeepSeek v4 Pro
 *   MODEL_SLOT_2_MODEL=deepseek-v4-flash
 *   MODEL_SLOT_2_DESCRIPTION=DeepSeek v4 Flash
 *
 *   MODEL_PROVIDER_2_BASE_URL=https://dashscope.aliyuncs.com/apps/anthropic
 *   MODEL_PROVIDER_2_API_KEY=sk-...
 *   MODEL_SLOT_3_MODEL=qwen3.8-flash
 *   MODEL_SLOT_3_DESCRIPTION=qwen3.8 flash
 *   ...
 *   MODEL_SLOT_10_MODEL=...
 *
 * A slot is only included when its MODEL_ value is set and non-empty. The
 * first configured slot (MODEL_SLOT_1) is treated as the default startup
 * engine by callers.
 *
 * Slot values are read from process.env (the launcher loads .env via
 * `bun --env-file`, which does not override pre-set shell vars), so exported
 * values still win. Attribution, however, only exists inside the .env file:
 * slots that come from shell env (or a session where no .env was loaded, e.g.
 * CC_HAHA_SKIP_DOTENV=1) get no provider and fall back to the global
 * ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN. The provider credential is sent
 * as an Authorization: Bearer token, overriding ANTHROPIC_AUTH_TOKEN.
 */
import { readFileSync } from 'node:fs'

export const MODEL_SLOT_COUNT = 10

const PROVIDER_KEY_RE = /^MODEL_PROVIDER_(.+?)_(BASE_URL|API_KEY)$/
const SLOT_MODEL_KEY_RE = /^MODEL_SLOT_(\d+)_MODEL$/

export type ConfiguredModelSlot = {
  index: number
  model: string
  description: string
  /**
   * Base URL of the provider block this slot sits under
   * (MODEL_PROVIDER_N_BASE_URL). When empty the global ANTHROPIC_BASE_URL is
   * used for requests on this slot.
   */
  baseUrl?: string
  /**
   * Credential of the provider block this slot sits under
   * (MODEL_PROVIDER_N_API_KEY), sent as an Authorization: Bearer token —
   * i.e. it overrides ANTHROPIC_AUTH_TOKEN. When empty the global auth env is
   * used.
   */
  apiKey?: string
}

function trimmed(value: string | undefined): string | undefined {
  if (!value) return undefined
  const t = value.trim()
  return t === '' ? undefined : t
}

/**
 * Ordered [key, providerIdForSlots] records extracted from the .env file:
 * - provider declaration lines map to their provider id
 * - MODEL_SLOT_N_MODEL lines map to the id of the nearest preceding provider
 * Cached after first read; missing/unreadable file yields an empty record.
 */
let fileLayout: Array<{ key: string; providerId: string | null }> | null =
  null

function getEnvFileLayout(): Array<{
  key: string
  providerId: string | null
}> {
  if (fileLayout) {
    return fileLayout
  }
  const layout: Array<{ key: string; providerId: string | null }> = []
  // Prefer the repo-root .env resolved from this module's own location so the
  // layout survives later process.chdir() (worktrees, selected project dirs);
  // fall back to cwd-relative, matching the launcher's `bun --env-file=.env`.
  const candidates = [
    new URL('../../../.env', import.meta.url),
    '.env',
  ] as const
  let text: string | null = null
  for (const candidate of candidates) {
    try {
      text = readFileSync(candidate, 'utf8')
      break
    } catch {
      // try the next candidate
    }
  }
  if (text !== null) {
    let currentProvider: string | null = null
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim()
      if (line === '' || line.startsWith('#')) {
        continue
      }
      const eq = line.indexOf('=')
      if (eq <= 0) {
        continue
      }
      const key = line.slice(0, eq).trim()
      const providerMatch = PROVIDER_KEY_RE.exec(key)
      if (providerMatch) {
        currentProvider = providerMatch[1]!
        layout.push({ key, providerId: currentProvider })
        continue
      }
      if (SLOT_MODEL_KEY_RE.test(key)) {
        layout.push({ key, providerId: currentProvider })
        continue
      }
      layout.push({ key, providerId: null })
    }
  }
  fileLayout = layout
  return layout
}

function findSlotProviderId(index: number): string | null {
  const key = `MODEL_SLOT_${index}_MODEL`
  for (const entry of getEnvFileLayout()) {
    if (entry.key === key) {
      return entry.providerId
    }
  }
  return null
}

/**
 * True when any MODEL_SLOT_* is configured in the environment. This forks the
 * app into "slot mode": env-configured vendor models become the sole source
 * of engines (default startup, /model list, request routing), and the
 * official Anthropic model paths stay unreachable until every MODEL_SLOT_*
 * line is removed.
 */
export function isModelSlotMode(): boolean {
  return getConfiguredModelSlots().length > 0
}

export function getConfiguredModelSlots(): ConfiguredModelSlot[] {
  const slots: ConfiguredModelSlot[] = []
  for (let i = 1; i <= MODEL_SLOT_COUNT; i++) {
    const model = trimmed(process.env[`MODEL_SLOT_${i}_MODEL`])
    if (!model) {
      continue
    }
    const slot: ConfiguredModelSlot = {
      index: i,
      model,
      description: trimmed(process.env[`MODEL_SLOT_${i}_DESCRIPTION`]) ?? '',
    }
    const providerId = findSlotProviderId(i)
    if (providerId) {
      const baseUrl = trimmed(
        process.env[`MODEL_PROVIDER_${providerId}_BASE_URL`],
      )
      const apiKey = trimmed(
        process.env[`MODEL_PROVIDER_${providerId}_API_KEY`],
      )
      if (baseUrl) slot.baseUrl = baseUrl
      if (apiKey) slot.apiKey = apiKey
    }
    slots.push(slot)
  }
  return slots
}
