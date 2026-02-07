import { registerPlugin } from '@capacitor/core';
import type { CoreResult } from '../domain/corePort';

export interface CorePlugin {
  doThing(options: { input: string }): Promise<CoreResult>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
