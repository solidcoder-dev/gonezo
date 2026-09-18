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
}
