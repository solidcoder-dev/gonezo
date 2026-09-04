import { describe, expect, it, vi } from 'vitest';
import type { CoreAdapterWeb } from './coreAdapterWeb';
import type { CorePort } from '../application/corePort';
import { MovementsRuntimeAdapter } from './movementsRuntimeAdapter';

describe('MovementsRuntimeAdapter movement reuse delegation', () => {
  it('delegates template reads to the web implementation', async () => {
    const movementReuseGetTemplate = vi.fn().mockResolvedValue({ representativeMovementId: 'movement-1' });
    const web = { movementReuseGetTemplate } as unknown as CoreAdapterWeb;
    const adapter = new MovementsRuntimeAdapter(web, {} as CorePort);

    await adapter.movementReuseGetTemplate({ representativeMovementId: 'movement-1' });

    expect(movementReuseGetTemplate).toHaveBeenCalledWith({ representativeMovementId: 'movement-1' });
  });
});
