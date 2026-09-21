import { describe, expect, it } from 'vitest';
import { createMacroMerchantCode } from './macroMerchantCode';

describe('MacroMerchantCode', () => {
  it.each(['MERCADONA', 'LIDL', 'CARREFOUR', 'UNMAPPED'])('accepts canonical code %s', (code) => {
    expect(createMacroMerchantCode(code)).toBe(code);
  });

  it.each(['mercadona', 'Lidl #123', '', 'LIDL-ES'])('rejects non-canonical identifier %s', (code) => {
    expect(() => createMacroMerchantCode(code)).toThrow();
  });
});
