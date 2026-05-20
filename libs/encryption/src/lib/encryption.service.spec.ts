import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { EncryptionService, EncryptedPayload } from './encryption.service.js';

// Generate a valid 32-byte key for testing
const TEST_MASTER_KEY = randomBytes(32).toString('base64');

function createService(key = TEST_MASTER_KEY): EncryptionService {
  const svc = new EncryptionService();
  process.env['ENCRYPTION_MASTER_KEY'] = key;
  svc.onModuleInit();
  return svc;
}

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeAll(() => {
    service = createService();
  });

  describe('encryptPii / decryptPii', () => {
    it('roundtrip returns original data', async () => {
      const pii = { name: 'John Doe', birthDate: '1990-01-15' };
      const encrypted = await service.encryptPii(pii);
      const decrypted = await service.decryptPii(encrypted);
      expect(decrypted).toEqual(pii);
    });

    it('different inputs produce different ciphertexts', async () => {
      const enc1 = await service.encryptPii({ name: 'Alice', birthDate: '2000-01-01' });
      const enc2 = await service.encryptPii({ name: 'Bob', birthDate: '1995-06-15' });
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    });

    it('same input encrypted twice produces different ciphertext (random IV/salt)', async () => {
      const pii = { name: 'Same Person', birthDate: '1985-03-20' };
      const enc1 = await service.encryptPii(pii);
      const enc2 = await service.encryptPii(pii);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.salt).not.toBe(enc2.salt);
    });

    it('tampered ciphertext throws error', async () => {
      const pii = { name: 'Test User', birthDate: '2000-05-10' };
      const encrypted = await service.encryptPii(pii);
      // Tamper with ciphertext
      const buf = Buffer.from(encrypted.ciphertext, 'base64');
      buf[0] ^= 0xff;
      const tampered: EncryptedPayload = {
        ...encrypted,
        ciphertext: buf.toString('base64'),
      };
      await expect(service.decryptPii(tampered)).rejects.toThrow();
    });

    it('tampered auth tag throws error', async () => {
      const pii = { name: 'Test User', birthDate: '2000-05-10' };
      const encrypted = await service.encryptPii(pii);
      // Tamper with auth tag
      const buf = Buffer.from(encrypted.authTag, 'base64');
      buf[0] ^= 0xff;
      const tampered: EncryptedPayload = {
        ...encrypted,
        authTag: buf.toString('base64'),
      };
      await expect(service.decryptPii(tampered)).rejects.toThrow();
    });

    it('invalid/wrong master key on decrypt throws error', async () => {
      const pii = { name: 'Sensitive', birthDate: '1970-01-01' };
      const encrypted = await service.encryptPii(pii);

      // Create a service with a different key
      const wrongKey = randomBytes(32).toString('base64');
      const wrongService = createService(wrongKey);
      await expect(wrongService.decryptPii(encrypted)).rejects.toThrow();
    });

    it('empty string fields work correctly', async () => {
      const pii = { name: '', birthDate: '' };
      const encrypted = await service.encryptPii(pii);
      const decrypted = await service.decryptPii(encrypted);
      expect(decrypted).toEqual(pii);
    });

    it('Unicode/Korean text roundtrip works', async () => {
      const pii = { name: '홍길동', birthDate: '1990-12-25' };
      const encrypted = await service.encryptPii(pii);
      const decrypted = await service.decryptPii(encrypted);
      expect(decrypted).toEqual(pii);
    });
  });

  describe('encryptString / decryptString', () => {
    it('roundtrip returns original string', async () => {
      const plaintext = 'Hello, this is a secret message with 한국어!';
      const encrypted = await service.encryptString(plaintext);
      const decrypted = await service.decryptString(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
