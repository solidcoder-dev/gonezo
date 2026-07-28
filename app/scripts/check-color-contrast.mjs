import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from 'sass';

const root = resolve(import.meta.dirname, '..');
const themeColors = JSON.parse(await readFile(resolve(root, 'src/styles/theme-colors.json'), 'utf8'));
const tokenCss = await readFile(resolve(root, 'src/styles/_gonezo-tokens.scss'), 'utf8');
const bootstrapCss = compile(resolve(root, 'src/styles/bootstrap.scss'), {
  loadPaths: [resolve(root, 'src/styles'), resolve(root, 'node_modules')],
}).css;

function fail(message) {
  throw new Error(message);
}

function extractBlock(css, marker) {
  const start = css.indexOf(marker);
  if (start === -1) fail(`No se encontró el bloque ${marker}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  fail(`No se pudo cerrar el bloque ${marker}`);
}

function parseCustomProperties(block) {
  return Object.fromEntries([...block.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function extractVarName(expression) {
  return expression.trim().slice(4, -1).replace(/^--/, '');
}

function normalizeHex(value) {
  const hex = value.trim();
  if (!/^#[0-9a-f]{3,8}$/i.test(hex)) return hex;
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return hex.toLowerCase();
}

function parseRgbColor(value) {
  const body = value.trim().replace(/^rgba?\(/i, '').replace(/\)$/u, '');
  const [channelsPart, alphaPart] = body.split('/');
  const channels = channelsPart.split(/[,\s]+/).filter(Boolean).map((channel) => Number(channel));
  if (channels.length < 3 || channels.some(Number.isNaN)) return null;
  const [r, g, b] = channels;
  const alpha = alphaPart ? Number.parseFloat(alphaPart) / (alphaPart.includes('%') ? 100 : 1) : 1;
  if (Number.isNaN(alpha)) return null;
  return { r, g, b, alpha };
}

function srgbToLinear(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function colorToRgba(value) {
  const normalized = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) {
    const hex = normalizeHex(normalized).slice(1);
    const channels = hex.match(/../g).map((part) => Number.parseInt(part, 16));
    if (channels.length === 3) return { r: channels[0], g: channels[1], b: channels[2], alpha: 1 };
    if (channels.length === 4) return { r: channels[0], g: channels[1], b: channels[2], alpha: channels[3] / 255 };
  }
  if (/^rgba?\(/i.test(normalized)) return parseRgbColor(normalized);
  return null;
}

export function contrastRatio(foreground, background) {
  const fg = colorToRgba(foreground);
  const bg = colorToRgba(background);
  if (!fg || !bg) fail(`No se pudo evaluar el color: foreground=${foreground}, background=${background}`);
  const blend = (top, bottom) => {
    const alpha = top.alpha + bottom.alpha * (1 - top.alpha);
    return {
      r: Math.round((top.r * top.alpha + bottom.r * bottom.alpha * (1 - top.alpha)) / alpha),
      g: Math.round((top.g * top.alpha + bottom.g * bottom.alpha * (1 - top.alpha)) / alpha),
      b: Math.round((top.b * top.alpha + bottom.b * bottom.alpha * (1 - top.alpha)) / alpha),
      alpha,
    };
  };
  const compositeForeground = fg.alpha < 1 ? blend(fg, bg) : fg;
  const compositeBackground = bg.alpha < 1 ? blend(bg, { r: 255, g: 255, b: 255, alpha: 1 }) : bg;
  const fgLuminance = 0.2126 * srgbToLinear(compositeForeground.r) + 0.7152 * srgbToLinear(compositeForeground.g) + 0.0722 * srgbToLinear(compositeForeground.b);
  const bgLuminance = 0.2126 * srgbToLinear(compositeBackground.r) + 0.7152 * srgbToLinear(compositeBackground.g) + 0.0722 * srgbToLinear(compositeBackground.b);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const bootstrapLight = parseCustomProperties(extractBlock(bootstrapCss, ':root,\n[data-bs-theme=light]'));
const bootstrapDark = parseCustomProperties(extractBlock(bootstrapCss, '[data-bs-theme=dark]'));
const tokenLight = parseCustomProperties(extractBlock(tokenCss, ':root'));
const tokenDark = parseCustomProperties(extractBlock(tokenCss, "[data-bs-theme='dark']"));

function resolveBootstrap(theme, name, seen = new Set()) {
  const source = theme === 'dark' ? bootstrapDark : bootstrapLight;
  const value = source[name] ?? bootstrapLight[name];
  if (!value) fail(`Variable Bootstrap inexistente: --${name}`);
  if (seen.has(`bs:${name}`)) fail(`Ciclo de variables Bootstrap detectado en --${name}`);
  seen.add(`bs:${name}`);
  return resolveExpression(theme, value, seen);
}

function resolveToken(theme, name, seen = new Set()) {
  const source = theme === 'dark' ? tokenDark : tokenLight;
  const value = source[name] ?? tokenLight[name];
  if (!value) fail(`Variable CSS inexistente: --${name}`);
  if (seen.has(`token:${name}`)) fail(`Ciclo de variables CSS detectado en --${name}`);
  seen.add(`token:${name}`);
  return resolveExpression(theme, value, seen);
}

function resolveExpression(theme, expression, seen) {
  const trimmed = expression.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return normalizeHex(trimmed);
  if (/^rgba?\(/i.test(trimmed)) return normalizeColorFunction(theme, trimmed, seen);
  if (/^var\(--[a-zA-Z0-9-]+\)$/i.test(trimmed)) {
    const name = extractVarName(trimmed);
    if (name.startsWith('bs-')) return resolveBootstrap(theme, name, seen);
    return resolveToken(theme, name, seen);
  }

  const substituted = trimmed.replace(/var\(--([a-zA-Z0-9-]+)\)/g, (_match, name) => {
    if (name.startsWith('bs-')) return resolveBootstrap(theme, name, seen);
    return resolveToken(theme, name, seen);
  });
  if (/^#[0-9a-f]{3,8}$/i.test(substituted)) return normalizeHex(substituted);
  if (/^rgba?\(/i.test(substituted)) return normalizeColorFunction(theme, substituted, seen);
  return substituted;
}

function normalizeColorFunction(theme, expression, seen) {
  const payload = expression.trim().replace(/^rgba?\(/i, '').replace(/\)$/u, '');
  const [channelsPart, alphaPart] = payload.split('/');
  const channels = channelsPart.split(/[,\s]+/).filter(Boolean).map((channel) => {
    const resolved = channel.startsWith('var(') ? resolveExpression(theme, channel, seen) : channel;
    return Number(resolved);
  });
  if (channels.length < 3 || channels.some(Number.isNaN)) fail(`No se pudo normalizar ${expression}`);
  const [r, g, b] = channels;
  const alpha = alphaPart ? Number.parseFloat(alphaPart) / (alphaPart.includes('%') ? 100 : 1) : 1;
  if (Number.isNaN(alpha)) fail(`No se pudo normalizar ${expression}`);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function assertContrast({ theme, foregroundToken, backgroundToken, minRatio, label }) {
  const foreground = resolveToken(theme, foregroundToken);
  const background = resolveToken(theme, backgroundToken);
  const ratio = contrastRatio(foreground, background);
  if (ratio < minRatio) {
    fail([
      `tema: ${theme}`,
      `foreground token: --${foregroundToken}`,
      `background token: --${backgroundToken}`,
      `ratio obtenido: ${ratio.toFixed(2)}:1`,
      `ratio mínimo: ${minRatio.toFixed(2)}:1`,
      label ? `label: ${label}` : null,
    ].filter(Boolean).join('\n'));
  }
  console.log(`tema=${theme} foreground=--${foregroundToken} background=--${backgroundToken} ratio=${ratio.toFixed(2)} min=${minRatio.toFixed(2)}`);
}

const semanticPairs = [
  ['brand', 'color-on-brand'],
  ['income', 'color-on-income'],
  ['expense', 'color-on-expense'],
  ['transfer', 'color-on-transfer'],
  ['success', 'color-on-success'],
  ['warning', 'color-on-warning'],
  ['danger', 'color-on-danger'],
  ['info', 'color-on-info'],
];

for (const theme of ['light', 'dark']) {
  for (const [paletteName, foregroundToken] of semanticPairs) {
    const backgroundToken = `color-${paletteName}`;
    const resolvedBackground = resolveToken(theme, backgroundToken);
    const expectedBackground = themeColors[`${paletteName}-color`];
    if (resolvedBackground !== expectedBackground) {
      fail(`La fuente compartida cambió sin regenerar el tema: ${theme} --${backgroundToken} = ${resolvedBackground}, esperado ${expectedBackground}`);
    }
    assertContrast({ theme, foregroundToken, backgroundToken, minRatio: 4.5 });
  }
  assertContrast({ theme, foregroundToken: 'color-text-primary', backgroundToken: 'color-surface', minRatio: 4.5 });
  assertContrast({ theme, foregroundToken: 'color-text-primary', backgroundToken: 'color-surface-secondary', minRatio: 4.5 });
  assertContrast({ theme, foregroundToken: 'color-text-primary', backgroundToken: 'color-surface-elevated', minRatio: 4.5 });
  assertContrast({ theme, foregroundToken: 'color-text-secondary', backgroundToken: 'color-surface', minRatio: 4.5 });
  assertContrast({ theme, foregroundToken: 'color-text-muted', backgroundToken: 'color-surface', minRatio: 4.5 });
}

if (resolveToken('light', 'color-text-inverse') !== resolveToken('dark', 'color-text-inverse')) {
  fail('--color-text-inverse cambió de significado entre light y dark');
}

export const SEMANTIC_CONTRAST_PAIRS = Object.fromEntries(
  semanticPairs.map(([paletteName, foregroundToken]) => [paletteName, [themeColors[`${paletteName}-color`], resolveToken('light', foregroundToken)]]),
);

export const DARK_SEMANTIC_CONTRAST_PAIRS = Object.fromEntries(
  semanticPairs.map(([paletteName, foregroundToken]) => [paletteName, [themeColors[`${paletteName}-color`], resolveToken('dark', foregroundToken)]]),
);

console.log(`contrast: passed (${semanticPairs.length} semantic pairs plus surface/text checks across light and dark themes)`);
