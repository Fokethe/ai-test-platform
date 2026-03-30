const {
  parseEnvContent,
  validateEnvVars,
  isMissingOrPlaceholder,
  isValidDatabaseUrl,
  isLikelyNestedPrismaSqlitePath,
} = require('../../../scripts/check-env');

describe('check-env script helpers', () => {
  test('parseEnvContent supports CRLF lines and quoted values', () => {
    const content = [
      '# comment',
      'NEXTAUTH_SECRET="secret-value"',
      'DATABASE_URL=file:./dev.db',
      'OPENAI_API_KEY=',
      '',
    ].join('\r\n');

    const parsed = parseEnvContent(content);

    expect(parsed.NEXTAUTH_SECRET).toBe('secret-value');
    expect(parsed.DATABASE_URL).toBe('file:./dev.db');
    expect(parsed.OPENAI_API_KEY).toBe('');
  });

  test('isMissingOrPlaceholder detects empty and placeholder values', () => {
    expect(isMissingOrPlaceholder('')).toBe(true);
    expect(isMissingOrPlaceholder('   ')).toBe(true);
    expect(isMissingOrPlaceholder('your-secret')).toBe(true);
    expect(isMissingOrPlaceholder('replace-with-value')).toBe(true);
    expect(isMissingOrPlaceholder('changeme')).toBe(true);
    expect(isMissingOrPlaceholder('real-secret-123')).toBe(false);
  });

  test('validateEnvVars returns required failures and optional warnings', () => {
    const result = validateEnvVars({
      NEXTAUTH_SECRET: 'your-secret',
      DATABASE_URL: 'file:./dev.db',
      OPENAI_API_KEY: '',
      KIMI_API_KEY: 'kimi-live-key',
    });

    expect(result.hasError).toBe(true);
    expect(result.missingRequired).toEqual(['NEXTAUTH_SECRET']);
    expect(result.configuredRequired).toEqual(['DATABASE_URL']);
    expect(result.configuredOptional).toEqual(['KIMI_API_KEY']);
    expect(result.missingOptional).toEqual(['OPENAI_API_KEY']);
  });

  test('isValidDatabaseUrl validates common prisma DSN formats', () => {
    expect(isValidDatabaseUrl('file:./dev.db')).toBe(true);
    expect(isValidDatabaseUrl('postgresql://user:pass@localhost:5432/db')).toBe(true);
    expect(isValidDatabaseUrl('mysql://user:pass@localhost:3306/db')).toBe(true);
    expect(isValidDatabaseUrl('not-a-db-url')).toBe(false);
    expect(isValidDatabaseUrl('')).toBe(false);
  });

  test('validateEnvVars marks invalid DATABASE_URL as error', () => {
    const result = validateEnvVars({
      NEXTAUTH_SECRET: 'dev-secret',
      DATABASE_URL: 'not-a-db-url',
      OPENAI_API_KEY: '',
      KIMI_API_KEY: '',
    });

    expect(result.hasError).toBe(true);
    expect(result.invalidRequired).toEqual(['DATABASE_URL']);
    expect(result.configuredRequired).toEqual(['NEXTAUTH_SECRET']);
  });

  test('isLikelyNestedPrismaSqlitePath detects risky nested sqlite path', () => {
    expect(isLikelyNestedPrismaSqlitePath('file:./prisma/dev.db')).toBe(true);
    expect(isLikelyNestedPrismaSqlitePath('file:.\\prisma\\dev.db')).toBe(true);
    expect(isLikelyNestedPrismaSqlitePath('file:./dev.db')).toBe(false);
  });
});
