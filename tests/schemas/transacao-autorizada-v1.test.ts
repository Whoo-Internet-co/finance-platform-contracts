import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const eventDir = join(root, 'events/transacao-autorizada/v1');

const validExample = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  event_type: 'TransacaoAutorizada',
  event_version: '1.0',
  occurred_at: '2026-09-23T20:00:00Z',
  id_autorizacao: 'AUT-001',
  id_contrato: 'CTR-001',
  valor: 100.0,
  saldo_reservado: 900.0,
  correlation_id: 'CORR-001',
  trace_id: null,
};

let validate: ValidateFunction;

beforeAll(async () => {
  const schema = JSON.parse(await readFile(join(eventDir, 'schema.json'), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  validate = ajv.compile(schema);
});

describe('TransacaoAutorizada v1 — schema', () => {
  it('1. example.json oficial deve ser válido', async () => {
    const example = JSON.parse(await readFile(join(eventDir, 'example.json'), 'utf8'));
    expect(validate(example), JSON.stringify(validate.errors)).toBe(true);
  });

  it('2. ausência de event_id deve falhar', () => {
    const { event_id: _removed, ...rest } = validExample;
    expect(validate(rest)).toBe(false);
  });

  it('3. UUID inválido em event_id deve falhar', () => {
    expect(validate({ ...validExample, event_id: 'nao-e-um-uuid' })).toBe(false);
  });

  it('4. event_type diferente deve falhar', () => {
    expect(validate({ ...validExample, event_type: 'TransacaoCriada' })).toBe(false);
  });

  it('5. event_version incompatível deve falhar', () => {
    expect(validate({ ...validExample, event_version: '2.0' })).toBe(false);
    expect(validate({ ...validExample, event_version: 'abc' })).toBe(false);
  });

  it('5b. event_version minor compatível (1.x) deve passar', () => {
    expect(validate({ ...validExample, event_version: '1.1' })).toBe(true);
  });

  it('6. occurred_at inválido deve falhar', () => {
    expect(validate({ ...validExample, occurred_at: '23/09/2026' })).toBe(false);
    expect(validate({ ...validExample, occurred_at: '2026-09-23 20:00:00' })).toBe(false);
  });

  it('6b. occurred_at sem UTC (Z) deve falhar', () => {
    expect(validate({ ...validExample, occurred_at: '2026-09-23T20:00:00+00:00' })).toBe(false);
  });

  it('7. valor inválido deve falhar', () => {
    expect(validate({ ...validExample, valor: 0 })).toBe(false);
    expect(validate({ ...validExample, valor: -10 })).toBe(false);
    expect(validate({ ...validExample, valor: '100' })).toBe(false);
  });

  it('7b. trace_id ausente (opcional) deve passar; tipo errado deve falhar', () => {
    const { trace_id: _removed, ...rest } = validExample;
    expect(validate(rest)).toBe(true);
    expect(validate({ ...validExample, trace_id: 123 })).toBe(false);
  });

  it('7c. campos adicionais opcionais devem ser tolerados (additionalProperties: true)', () => {
    expect(validate({ ...validExample, campo_futuro_opcional: 'x' })).toBe(true);
  });

  it('8. todos os invalid-examples devem realmente falhar', async () => {
    const dir = join(eventDir, 'invalid-examples');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const data = JSON.parse(await readFile(join(dir, file), 'utf8'));
      expect(validate(data), `${file} deveria ser inválido`).toBe(false);
    }
  });
});

describe('OpenAPI Authorization v1', () => {
  it('9. openapi.yaml deve ser sintaticamente válido', async () => {
    const api = await SwaggerParser.validate(join(root, 'openapi/authorization/v1/openapi.yaml'));
    expect(api.openapi).toMatch(/^3\./);
  });

  it('9b. deve expor POST /v1/contratos/{id_contrato}/autorizacoes com Idempotency-Key obrigatório', async () => {
    const api = (await SwaggerParser.dereference(
      join(root, 'openapi/authorization/v1/openapi.yaml'),
    )) as Record<string, unknown>;
    const paths = api.paths as Record<string, Record<string, unknown>>;
    const post = paths['/v1/contratos/{id_contrato}/autorizacoes']?.post as Record<string, unknown>;
    expect(post).toBeDefined();

    const parameters = post.parameters as Array<Record<string, unknown>>;
    const idempotencyHeader = parameters.find((p) => p.name === 'Idempotency-Key');
    expect(idempotencyHeader?.in).toBe('header');
    expect(idempotencyHeader?.required).toBe(true);

    const responses = Object.keys(post.responses as Record<string, unknown>);
    for (const code of ['200', '201', '402', '409', '422', '429', '503']) {
      expect(responses).toContain(code);
    }
  });
});
