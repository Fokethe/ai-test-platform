#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_VARS = ['NEXTAUTH_SECRET', 'DATABASE_URL'];
const OPTIONAL_ENV_VARS = ['KIMI_API_KEY', 'OPENAI_API_KEY'];
const PLACEHOLDER_PATTERNS = [/^your[-_]/i, /^changeme$/i, /^replace[-_]/i];

function parseEnvContent(envContent) {
  const envVars = {};

  // Keep CRLF compatibility on Windows.
  envContent.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) {
      return;
    }

    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  });

  return envVars;
}

function isMissingOrPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isValidDatabaseUrl(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  // SQLite format accepted by Prisma, e.g. file:./prisma/dev.db
  if (normalized.startsWith('file:')) {
    return true;
  }

  // Accept common DSN schemes for external databases.
  return /^(postgres(?:ql)?|mysql|sqlserver|mongodb):\/\//i.test(normalized);
}

function validateEnvVars(envVars) {
  const missingRequired = [];
  const invalidRequired = [];
  const configuredRequired = [];
  const configuredOptional = [];
  const missingOptional = [];

  REQUIRED_ENV_VARS.forEach((key) => {
    if (isMissingOrPlaceholder(envVars[key])) {
      missingRequired.push(key);
      return;
    }

    if (key === 'DATABASE_URL' && !isValidDatabaseUrl(envVars[key])) {
      invalidRequired.push(key);
      return;
    } else {
      configuredRequired.push(key);
    }
  });

  OPTIONAL_ENV_VARS.forEach((key) => {
    if (isMissingOrPlaceholder(envVars[key])) {
      missingOptional.push(key);
    } else {
      configuredOptional.push(key);
    }
  });

  return {
    missingRequired,
    invalidRequired,
    configuredRequired,
    missingOptional,
    configuredOptional,
    hasError: missingRequired.length > 0 || invalidRequired.length > 0,
  };
}

function runEnvCheck() {
  console.log('Checking environment variables...\n');

  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('ERROR: .env file not found.');
    console.log('Fix: copy .env.example to .env and fill required values.');
    return 1;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = parseEnvContent(envContent);
  const result = validateEnvVars(envVars);

  result.configuredRequired.forEach((key) => {
    console.log(`OK   REQUIRED ${key}`);
  });

  result.missingRequired.forEach((key) => {
    console.log(`FAIL REQUIRED ${key} is missing or placeholder.`);
    console.log(`Fix: set ${key} in .env (see .env.example).`);
  });

  result.invalidRequired.forEach((key) => {
    console.log(`FAIL REQUIRED ${key} has invalid format.`);
    console.log('Fix: use file:./prisma/dev.db or a valid database URL scheme.');
  });

  result.configuredOptional.forEach((key) => {
    console.log(`OK   OPTIONAL ${key}`);
  });

  result.missingOptional.forEach((key) => {
    console.log(`WARN OPTIONAL ${key} is not set.`);
  });

  if (result.hasError) {
    console.log('\nEnvironment check failed.');
    return 1;
  }

  console.log('\nEnvironment check passed.');
  return 0;
}

if (require.main === module) {
  process.exit(runEnvCheck());
}

module.exports = {
  parseEnvContent,
  validateEnvVars,
  isMissingOrPlaceholder,
  isValidDatabaseUrl,
  runEnvCheck,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
};
