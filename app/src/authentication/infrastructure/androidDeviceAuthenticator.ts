import type { DeviceAuthenticator } from '../application/authenticationService';
import { AuthenticationNativePlugin } from './authenticationPlugin';

export class AndroidDeviceAuthenticator implements DeviceAuthenticator {
  async authenticate(): Promise<void> {
    await AuthenticationNativePlugin.authenticateDevice();
  }

  async isAvailable(): Promise<boolean> {
    const result = await AuthenticationNativePlugin.isDeviceAuthenticationAvailable();
    return result.available;
  }

  async isEnabled(): Promise<boolean> {
    const result = await AuthenticationNativePlugin.isDeviceUnlockEnabled();
    return result.enabled;
  }

  async enable(): Promise<void> {
    await AuthenticationNativePlugin.enableDeviceUnlock();
  }

  async disable(): Promise<void> {
    await AuthenticationNativePlugin.disableDeviceUnlock();
  }
}
