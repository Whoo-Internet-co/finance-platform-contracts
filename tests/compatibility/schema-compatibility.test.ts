/**
 * Verificação BÁSICA de compatibilidade backward do schema atual vs baseline.
 *
 * O baseline é um snapshot do schema na versão 1.0.0 (primeira publicação).
 * Regras verificadas (subconjunto conservador — ver LIMITAÇÕES):
 *
 * 1. Nenhum campo obrigatório do baseline pode ser removido de `required`;
 * 2. Nenhum campo do baseline pode ter o tipo alterado de forma incompatível;
 * 3. Nenhum campo NOVO pode se tornar obrigatório (novo required) dentro da
 *    mesma linha de versão (v1);
 * 4. A política de `additionalProperties` não pode se tornar mais restritiva
 *    (true → false quebraria tolerant readers);
 * 5. `const`/`enum` de campos existentes não podem mudar;
 * 6. Patterns de campos existentes não podem ser trocados por outro pattern.
 *
 * LIMITAÇÕES (documentadas — não é garantia completa de compatibilidade):
 * - Não prova que todo documento válido no baseline continua válido no atual
 *   (ex.: restringir `minimum` de um campo existente NÃO é detectado);
 * - Não analisa `patternProperties`, composições (allOf/anyOf) nem refs;
 * - Não verifica compatibilidade do OpenAPI (apenas eventos JSON Schema).
 *
 * A garantia completa depende de revisão arquitetural obrigatória em PRs
 * que alterem contratos (ver README — governança) e da política SemVer em
 * docs/versioning.md.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

type JsonSchema = {
  required?: string[];
  additionalProperties?: boolean | object;
  properties?: Record<
    string,
    {
      type?: string | string[];
      const?: unknown;
      enum?: unknown[];
      pattern?: string;
    }
  >;
};

let baseline: JsonSchema;
let current: JsonSchema;

beforeAll(async () => {
  baseline = JSON.parse(
    await readFile(
      join(root, 'tests/compatibility/baseline/transacao-autorizada-v1-baseline.json'),
      'utf8',
    ),
  );
  current = JSON.parse(
    await readFile(join(root, 'events/transacao-autorizada/v1/schema.json'), 'utf8'),
  );
});

function typeOf(
  prop: { type?: string | string[] } | undefined,
): string[] {
  if (!prop?.type) return [];
  return Array.isArray(prop.type) ? [...prop.type].sort() : [prop.type];
}

describe('Compatibilidade backward — TransacaoAutorizada v1 (atual vs baseline 1.0.0)', () => {
  it('nenhum campo obrigatório do baseline foi removido de required', () => {
    const currentRequired = new Set(current.required ?? []);
    for (const field of baseline.required ?? []) {
      expect(currentRequired.has(field), `campo obrigatório removido: ${field}`).toBe(true);
    }
  });

  it('nenhum campo do baseline teve o tipo alterado', () => {
    for (const [name, prop] of Object.entries(baseline.properties ?? {})) {
      const currentProp = current.properties?.[name];
      expect(currentProp, `campo removido: ${name}`).toBeDefined();
      expect(typeOf(currentProp), `tipo alterado em: ${name}`).toEqual(typeOf(prop));
    }
  });

  it('nenhum campo novo se tornou obrigatório (novo required quebra consumidores antigos)', () => {
    const baselineRequired = new Set(baseline.required ?? []);
    const newRequired = (current.required ?? []).filter((f) => !baselineRequired.has(f));
    expect(newRequired, `novos campos obrigatórios: ${newRequired.join(', ')}`).toEqual([]);
  });

  it('additionalProperties não se tornou mais restritivo', () => {
    const baselineAllows = baseline.additionalProperties !== false;
    const currentAllows = current.additionalProperties !== false;
    if (baselineAllows) {
      expect(currentAllows, 'additionalProperties mudou de true para false').toBe(true);
    }
  });

  it('const/enum de campos existentes não mudaram', () => {
    for (const [name, prop] of Object.entries(baseline.properties ?? {})) {
      const currentProp = current.properties?.[name];
      if (prop.const !== undefined) {
        expect(currentProp?.const, `const alterado em: ${name}`).toEqual(prop.const);
      }
      if (prop.enum !== undefined) {
        expect(currentProp?.enum, `enum alterado em: ${name}`).toEqual(prop.enum);
      }
    }
  });

  it('patterns de campos existentes não foram trocados', () => {
    for (const [name, prop] of Object.entries(baseline.properties ?? {})) {
      if (prop.pattern !== undefined) {
        expect(current.properties?.[name]?.pattern, `pattern alterado em: ${name}`).toBe(
          prop.pattern,
        );
      }
    }
  });
});
