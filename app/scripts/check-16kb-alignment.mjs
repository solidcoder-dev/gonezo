import { existsSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apk = process.argv[2] ?? resolve(appRoot, 'android/app/build/outputs/apk/debug/app-debug.apk');
const readelf = process.env.LLVM_READELF;
const zipalign = process.env.ZIPALIGN;

if (!existsSync(apk)) {
  console.error(`16 KB check failed: APK not found: ${apk}`);
  process.exit(1);
}

if (!readelf || !existsSync(readelf)) {
  console.error('16 KB check failed: set LLVM_READELF to the NDK llvm-readelf executable.');
  process.exit(1);
}

if (!zipalign || !existsSync(zipalign)) {
  console.error('16 KB check failed: set ZIPALIGN to the Android SDK zipalign executable.');
  process.exit(1);
}

const apkListing = execFileSync('unzip', ['-Z1', apk], { encoding: 'utf8' });
const libraries = apkListing.split('\n').filter((entry) => entry.endsWith('.so'));
if (libraries.length === 0) {
  console.error('16 KB check failed: APK contains no native libraries.');
  process.exit(1);
}

const extracted = resolve(appRoot, '.16kb-check');
rmSync(extracted, { recursive: true, force: true });
execFileSync('unzip', ['-q', apk, '-d', extracted]);
const failures = [];
for (const library of libraries) {
  const path = join(extracted, library);
  const output = execFileSync(readelf, ['-lW', path], { encoding: 'utf8' });
  const loads = output.split('\n').filter((line) => /\sLOAD\s/.test(line));
  if (loads.some((line) => !/0x4000$/.test(line.trim()))) {
    failures.push(library);
  }
}
rmSync(extracted, { recursive: true, force: true });

console.log(`16 KB ELF alignment passed for ${libraries.length} libraries:`);
const mergedLibraries = resolve(appRoot, 'android/app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs/out/lib');
if (existsSync(mergedLibraries)) {
  for (const abi of readdirSync(mergedLibraries, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    console.log(`  ${abi.name}: ${libraries.filter((library) => library.startsWith(`lib/${abi.name}/`)).join(', ') || 'none'}`);
  }
}
if (failures.length > 0) {
  console.error(`16 KB check failed for: ${failures.join(', ')}`);
  process.exit(1);
}

execFileSync(zipalign, ['-c', '-P', '16', '-v', '4', apk], { stdio: 'inherit' });
