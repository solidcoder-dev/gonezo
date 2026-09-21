declare const macroMerchantCodeBrand: unique symbol;

export type MacroMerchantCode = string & Readonly<{ [macroMerchantCodeBrand]: true }>;

export function createMacroMerchantCode(value: string): MacroMerchantCode {
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) throw new Error('Macro merchant code must be an uppercase canonical identifier');
  return value as MacroMerchantCode;
}

export const UNMAPPED_MACRO_MERCHANT_CODE = createMacroMerchantCode('UNMAPPED');
