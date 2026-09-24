/**
 * Validação dos contratos do repositório:
 *
 * 1. example.json de cada evento DEVE ser válido contra o schema;
 * 2. todos os arquivos em invalid-examples/ DEVEM falhar;
 * 3. documentos OpenAPI DEVEM ser sintaticamente válidos.
 *
 * Exit code 0 = tudo válido; 1 = falha.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;

function ok(message: string): void {
  console.log(`  PASS  ${message}`);
}

function fail(message: string): void {
  failures += 1;
  console.error(`  FAIL  ${message}`);
}

function makeAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv;
}

async function validateEventDir(eventDir: string): Promise<void> {
  const schema = JSON.parse(await readFile(join(eventDir, 'schema.json'), 'utf8'));
  const ajv = makeAjv();
  const validate = ajv.compile(schema);

  const example = JSON.parse(await readFile(join(eventDir, 'example.json'), 'utf8'));
  if (validate(example)) {
    ok(`${eventDir}: example.json é válido`);
  } else {
    fail(`${eventDir}: example.json INVÁLIDO — ${ajv.errorsText(validate.errors)}`);
  }

  const invalidDir = join(eventDir, 'invalid-examples');
  let invalidFiles: string[] = [];
  try {
    invalidFiles = (await readdir(invalidDir)).filter((f) => f.endsWith('.json'));
  } catch {
    // diretório opcional
  }
  for (const file of invalidFiles) {
    const data = JSON.parse(await readFile(join(invalidDir, file), 'utf8'));
    if (validate(data)) {
      fail(`${eventDir}: invalid-examples/${file} deveria falhar, mas PASSOU`);
    } else {
      ok(`${eventDir}: invalid-examples/${file} falhou como esperado`);
    }
  }
}

async function validateOpenApi(filePath: string): Promise<void> {
  try {
    await SwaggerParser.validate(filePath);
    ok(`${filePath}: OpenAPI sintaticamente válido`);
  } catch (err) {
    fail(`${filePath}: OpenAPI inválido — ${(err as Error).message}`);
  }
}

console.log('Validando contratos de eventos...');
await validateEventDir(join(root, 'events/transacao-autorizada/v1'));

console.log('Validando documentos OpenAPI...');
await validateOpenApi(join(root, 'openapi/authorization/v1/openapi.yaml'));

if (failures > 0) {
  console.error(`\n${failures} falha(s) na validação dos contratos.`);
  process.exit(1);
}
console.log('\nTodos os contratos válidos.');
