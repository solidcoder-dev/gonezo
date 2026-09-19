import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
import type { MacroAnalyticsPublicationProcessorPort, PublicationProcessingStatus } from './macroAnalyticsPublicationProcessor.port';

export type PendingPublicationProcessingResult = Readonly<{
  period: string;
  status: PublicationProcessingStatus;
  removedFromOutbox: boolean;
}>;

export async function processPendingMacroAnalyticsPublications(
  userId: string,
  ports: Readonly<{ outbox: MacroAnalyticsOutboxPort; processor: MacroAnalyticsPublicationProcessorPort }>,
): Promise<readonly PendingPublicationProcessingResult[]> {
  const publications = await ports.outbox.listPending(userId);
  const results: PendingPublicationProcessingResult[] = [];
  for (const publication of publications) {
    const status = await ports.processor.process(publication);
    const removedFromOutbox = status !== 'REVISION_CONFLICT';
    if (removedFromOutbox) await ports.outbox.remove(userId, publication.period);
    results.push({ period: publication.period.value, status, removedFromOutbox });
  }
  return results;
}
