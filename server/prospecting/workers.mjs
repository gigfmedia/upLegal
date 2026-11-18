const DEFAULT_SCRUB_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function createProspectingWorkers({
  ledger,
  repository,
  logger = console,
  clock = () => new Date(),
  scrubIntervalMs = DEFAULT_SCRUB_INTERVAL_MS,
} = {}) {
  if (!ledger) throw new Error('ledger required');
  if (!repository) throw new Error('repository required');

  let inFlight = null;
  let lastScrubAt = 0;

  async function run({ scrub = false, limit = 100 } = {}) {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const now = clock();
      const nowIso = now.toISOString();
      const result = {
        recovered: null,
        reprocessed: null,
        scrubbed: null,
      };

      try {
        result.recovered = await ledger.recoverStale({ now: nowIso, markReady: false });
      } catch (error) {
        logger.error?.('[Prospecting] worker recovery failed', { error: error?.message || error });
      }

      try {
        result.reprocessed = await ledger.reprocessProviderEvents({ limit, now: nowIso });
      } catch (error) {
        logger.error?.('[Prospecting] worker event reprocess failed', { error: error?.message || error });
      }

      if (scrub && now.getTime() - lastScrubAt >= scrubIntervalMs) {
        try {
          result.scrubbed = await ledger.scrubPii({ now: nowIso });
          lastScrubAt = now.getTime();
        } catch (error) {
          logger.error?.('[Prospecting] worker PII scrub failed', { error: error?.message || error });
        }
      }

      return result;
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  }

  async function health() {
    return repository.getOperationalHealth();
  }

  return { run, health };
}
