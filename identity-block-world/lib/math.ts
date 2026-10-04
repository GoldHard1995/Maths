const digits: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n' };
export function toLatex(value: string): string {
  return value.replace(/frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, n: string, d: string) => `\\frac{${toLatex(n)}}{${toLatex(d)}}`)
    .replace(/\^([0-9]+)/g, '^{$1}').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g, v => `^{${v.split('').map(c => digits[c]).join('')}}`)
    .replaceAll('＋', '+').replaceAll('−', '-').replaceAll('×', '\\times ').replaceAll('≡', '\\equiv ')
    .replaceAll('≠', '\\ne ').replaceAll('　', '\\quad ');
}
