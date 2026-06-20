import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface TrustedDevice {
  deviceId: string;
  token: string;
  addedAt: number;
}

interface AppConfig {
  trustedDevices: TrustedDevice[];
}

class Store {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'flaro-config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data) as AppConfig;
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
    return { trustedDevices: [] };
  }

  private saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }

  public getTrustedDevices(): TrustedDevice[] {
    return this.config.trustedDevices;
  }

  public isTokenValid(token: string): boolean {
    return this.config.trustedDevices.some(d => d.token === token);
  }

  public addTrustedDevice(deviceId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.config.trustedDevices.push({
      deviceId,
      token,
      addedAt: Date.now()
    });
    this.saveConfig();
    return token;
  }

  public revokeDevice(deviceId: string) {
    this.config.trustedDevices = this.config.trustedDevices.filter(d => d.deviceId !== deviceId);
    this.saveConfig();
  }
}

export const appStore = new Store();
