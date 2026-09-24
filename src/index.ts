/**
 * finance-platform-contracts
 *
 * Este módulo expõe APENAS caminhos e loaders de artefatos de contrato
 * (JSON Schema, OpenAPI, exemplos). Não contém lógica de domínio.
 *
 * Os schemas são a source of truth. Tipos TypeScript exportados são
 * artefatos derivados, gerados automaticamente a partir dos schemas
 * (ver scripts/generate-types.mjs).
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

export type { TransacaoAutorizada } from './generated/transacao-autorizada-v1.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Caminhos (absolutos) dos artefatos de contrato. */
export const contractPaths = {
  events: {
    transacaoAutorizada: {
      v1: {
        schema: join(packageRoot, 'events/transacao-autorizada/v1/schema.json'),
        example: join(packageRoot, 'events/transacao-autorizada/v1/example.json'),
      },
    },
  },
  openapi: {
    authorization: {
      v1: join(packageRoot, 'openapi/authorization/v1/openapi.yaml'),
    },
  },
} as const;

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/** Carrega o JSON Schema canônico de TransacaoAutorizada v1. */
export async function loadTransacaoAutorizadaV1Schema(): Promise<Record<string, unknown>> {
  return (await readJson(contractPaths.events.transacaoAutorizada.v1.schema)) as Record<
    string,
    unknown
  >;
}

/** Carrega o exemplo válido oficial de TransacaoAutorizada v1. */
export async function loadTransacaoAutorizadaV1Example(): Promise<Record<string, unknown>> {
  return (await readJson(contractPaths.events.transacaoAutorizada.v1.example)) as Record<
    string,
    unknown
  >;
}

/** Carrega o documento OpenAPI v1 do Authorization Service (objeto parseado). */
export async function loadAuthorizationOpenApiV1(): Promise<Record<string, unknown>> {
  const raw = await readFile(contractPaths.openapi.authorization.v1, 'utf8');
  return yaml.load(raw) as Record<string, unknown>;
}
