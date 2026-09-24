/**
 * Gera tipos TypeScript DERIVADOS dos JSON Schemas.
 *
 * O schema.json é a source of truth — este script evita contract drift,
 * pois os tipos nunca são mantidos manualmente.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const BANNER = `/**
 * ARQUIVO GERADO AUTOMATICAMENTE — NÃO EDITAR.
 * Derivado de events/transacao-autorizada/v1/schema.json (source of truth).
 * Regenerar com: npm run generate:types
 */
`;

const schema = JSON.parse(
  await readFile(new URL('../events/transacao-autorizada/v1/schema.json', import.meta.url), 'utf8'),
);

const ts = await compile(schema, 'TransacaoAutorizada', {
  bannerComment: '',
  additionalProperties: true,
  format: false,
});

await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../src/generated/transacao-autorizada-v1.ts', import.meta.url),
  BANNER + ts,
);

console.log('Tipos gerados: src/generated/transacao-autorizada-v1.ts');
