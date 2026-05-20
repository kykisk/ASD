export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'scaffold', 'prisma', 'encryption', 'prisma-client',
        'auth', 'users', 'families', 'children',
        'schedules', 'questionnaires', 'assessments', 'curricula',
        'activities', 'dashboard', 'notifications', 'reports',
        'research', 'wellbeing', 'emergency', 'sensory', 'licenses',
        'admin', 'ai-provider', 'ai-config', 'ai-service',
        'api-client', 'cache', 'security', 'consent', 'gdpr',
        'uploads', 'web', 'mobile', 'infra', 'e2e', 'deps', 'config',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
};
