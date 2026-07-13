import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('schema-guided interpretation protocol architecture', () => {
  it('keeps JSON serialization inside the dedicated codec', () => {
    const codecSource = readFileSync(resolve('src/core/infrastructure/interpretation/schemaGuidedInterpretationJsonCodec.ts'), 'utf8');
    const pluginSource = readFileSync(resolve('src/core/infrastructure/interpretation/schemaGuidedInterpretationPlugin.ts'), 'utf8');
    const adapterSource = readFileSync(resolve('src/core/infrastructure/audio/nativeMovementEntryDraftInterpreterAdapter.ts'), 'utf8');

    expect(codecSource).toContain('JSON.stringify(');
    expect(codecSource).toContain('JSON.parse(');
    expect(pluginSource).not.toContain('JSON.stringify(');
    expect(pluginSource).not.toContain('JSON.parse(');
    expect(pluginSource).not.toContain('as InterpretationResult');
    expect(adapterSource).not.toContain('JSON.stringify(');
    expect(adapterSource).not.toContain('JSON.parse(');
  });
});
