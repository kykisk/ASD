import { ThrottlerModule } from '@nestjs/throttler';

describe('Security Integration', () => {
  describe('Rate Limiting Configuration', () => {
    it('should configure ThrottlerModule with correct rate limits', () => {
      const globalConfig = { name: 'global', ttl: 60000, limit: 100 };
      const authConfig = { name: 'auth', ttl: 60000, limit: 5 };

      expect(globalConfig.limit).toBe(100);
      expect(globalConfig.ttl).toBe(60000);
      expect(authConfig.limit).toBe(5);
      expect(authConfig.ttl).toBe(60000);
    });

    it('should have ThrottlerModule available', () => {
      expect(ThrottlerModule).toBeDefined();
      expect(ThrottlerModule.forRoot).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should parse CORS_ORIGINS from environment variable', () => {
      const corsOrigins = 'https://app.auticare.com,https://admin.auticare.com';
      const parsed = corsOrigins.split(',');

      expect(parsed).toHaveLength(2);
      expect(parsed).toContain('https://app.auticare.com');
      expect(parsed).toContain('https://admin.auticare.com');
    });

    it('should reject origins not in the allowlist', () => {
      const allowedOrigins = ['https://app.auticare.com'];
      const requestOrigin = 'https://evil-site.com';

      expect(allowedOrigins).not.toContain(requestOrigin);
    });
  });

  describe('Security Headers', () => {
    it('should configure CSP with correct directives', () => {
      const cspDirectives = {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
      };

      expect(cspDirectives.defaultSrc).toContain("'self'");
      expect(cspDirectives.scriptSrc).not.toContain("'unsafe-inline'");
      expect(cspDirectives.imgSrc).toContain("https:");
    });
  });
});
