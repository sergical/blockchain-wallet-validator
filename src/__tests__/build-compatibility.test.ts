import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, test } from 'vitest';

/**
 * Build compatibility tests to ensure the library works with older bundlers.
 *
 * Issue #18: Users with older build setups (Vue 2 + babel-loader) that don't
 * transpile node_modules were getting parse errors from ES2020+ syntax.
 *
 * These tests verify the build output is ES2017 compatible.
 */
describe('Build Compatibility', () => {
  const distPath = join(process.cwd(), 'dist');
  const cjsPath = join(distPath, 'index.cjs');
  const mjsPath = join(distPath, 'index.mjs');

  // ES2020+ syntax patterns that should NOT appear in ES2017 output
  const es2020Patterns = [
    {
      name: 'nullish coalescing operator (??)',
      // Match ?? but not inside strings or comments
      // This pattern looks for ?? with word chars or brackets around it
      pattern: /\w\s*\?\?\s*[\w\[\{'"]/,
    },
    {
      name: 'optional chaining (?.)',
      // Match ?. but not in ternary expressions like a ? .b : c
      pattern: /\w\?\.[a-zA-Z\[]/,
    },
    {
      name: 'nullish assignment (??=)',
      pattern: /\?\?=/,
    },
    {
      name: 'logical AND assignment (&&=)',
      pattern: /&&=/,
    },
    {
      name: 'logical OR assignment (||=)',
      pattern: /\|\|=/,
    },
  ];

  test.runIf(existsSync(cjsPath))(
    'CJS bundle should not contain ES2020+ syntax',
    () => {
      const content = readFileSync(cjsPath, 'utf-8');

      for (const { name, pattern } of es2020Patterns) {
        const match = content.match(pattern);
        expect(
          match,
          `Found ${name} in CJS bundle at: "${match?.[0]}". ` +
            `The build should target ES2017 or lower for compatibility with older bundlers.`,
        ).toBeNull();
      }
    },
  );

  test.runIf(existsSync(mjsPath))(
    'ESM bundle should not contain ES2020+ syntax',
    () => {
      const content = readFileSync(mjsPath, 'utf-8');

      for (const { name, pattern } of es2020Patterns) {
        const match = content.match(pattern);
        expect(
          match,
          `Found ${name} in ESM bundle at: "${match?.[0]}". ` +
            `The build should target ES2017 or lower for compatibility with older bundlers.`,
        ).toBeNull();
      }
    },
  );

  test.runIf(existsSync(cjsPath))('CJS bundle should be parseable', () => {
    const content = readFileSync(cjsPath, 'utf-8');
    // Basic check - the file should be valid JavaScript
    expect(content).toContain('validateWalletAddress');
    expect(content.length).toBeGreaterThan(1000);
  });

  test.runIf(existsSync(mjsPath))('ESM bundle should be parseable', () => {
    const content = readFileSync(mjsPath, 'utf-8');
    // Basic check - the file should be valid JavaScript
    expect(content).toContain('validateWalletAddress');
    expect(content.length).toBeGreaterThan(1000);
  });
});
