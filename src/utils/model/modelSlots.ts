/**
 * Generic numbered model slots, configured through environment variables:
 *
 *   MODEL_SLOT_1_MODEL=deepseek-v4-flash
 *   MODEL_SLOT_1_DESCRIPTION=Sonnet slot for everyday tasks
 *   MODEL_SLOT_1_BASE_URL=https://api.deepseek.com/anthropic   (optional)
 *   MODEL_SLOT_1_API_KEY=sk-...                               (optional)
 *   ...
 *   MODEL_SLOT_10_MODEL=...
 *
 * Up to MODEL_SLOT_COUNT slots are scanned. A slot is only included when its
 * MODEL_ field is set and non-empty, so slots that aren't written in the env
 * are simply not shown. The first configured slot (MODEL_SLOT_1) is treated as
 * the default startup engine by callers.
 */
export const MODEL_SLOT_COUNT = 10

export type ConfiguredModelSlot = {
  index: number
  model: string
  description: string
  /**
   * Optional per-slot API base URL (MODEL_SLOT_N_BASE_URL). When empty the
   * global ANTHROPIC_BASE_URL is used for requests on this slot.
   */
  baseUrl?: string
  /**
   * Optional per-slot credential (MODEL_SLOT_N_API_KEY), sent as an
   * Authorization: Bearer token — i.e. it overrides ANTHROPIC_AUTH_TOKEN.
   * When empty the global auth env is used.
   */
  apiKey?: string
}

export function getConfiguredModelSlots(): ConfiguredModelSlot[] {
  const slots: ConfiguredModelSlot[] = []
  for (let i = 1; i <= MODEL_SLOT_COUNT; i++) {
    const model = process.env[`MODEL_SLOT_${i}_MODEL`]
    if (model && model.trim() !== '') {
      const description = process.env[`MODEL_SLOT_${i}_DESCRIPTION`]
      const baseUrl = process.env[`MODEL_SLOT_${i}_BASE_URL`]
      const apiKey = process.env[`MODEL_SLOT_${i}_API_KEY`]
      const slot: ConfiguredModelSlot = {
        index: i,
        model: model.trim(),
        description: description ? description.trim() : '',
      }
      if (baseUrl && baseUrl.trim() !== '') {
        slot.baseUrl = baseUrl.trim()
      }
      if (apiKey && apiKey.trim() !== '') {
        slot.apiKey = apiKey.trim()
      }
      slots.push(slot)
    }
  }
  return slots
}
