import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, hkdf } from 'node:crypto';
import { promisify } from 'node:util';

const hkdfAsync = promisify(hkdf);

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
}

export interface PiiFields {
  name: string;
  birthDate: string;
}

const INFO = 'auticare:pii:v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

@Injectable()
export class EncryptionService implements OnModuleInit {
  private masterKey!: Buffer;

  onModuleInit() {
    const keyBase64 = process.env['ENCRYPTION_MASTER_KEY'];
    if (!keyBase64) throw new Error('ENCRYPTION_MASTER_KEY env var is not set');
    this.masterKey = Buffer.from(keyBase64, 'base64');
    if (this.masterKey.length !== KEY_LENGTH) {
      throw new Error('ENCRYPTION_MASTER_KEY must be 32 bytes (256 bits) base64-encoded');
    }
  }

  private async deriveKey(salt: Buffer): Promise<Buffer> {
    const derived = await hkdfAsync('sha256', this.masterKey, salt, INFO, KEY_LENGTH);
    return Buffer.from(derived);
  }

  async encryptPii(fields: PiiFields): Promise<EncryptedPayload> {
    return this.encryptString(JSON.stringify(fields));
  }

  async decryptPii(payload: EncryptedPayload): Promise<PiiFields> {
    const json = await this.decryptString(payload);
    return JSON.parse(json) as PiiFields;
  }

  async encryptString(plaintext: string): Promise<EncryptedPayload> {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = await this.deriveKey(salt);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  async decryptString(payload: EncryptedPayload): Promise<string> {
    const salt = Buffer.from(payload.salt, 'base64');
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const key = await this.deriveKey(salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
