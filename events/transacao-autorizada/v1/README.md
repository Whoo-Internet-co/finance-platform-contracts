# TransacaoAutorizada v1

Evento publicado pelo **Authorization Service** quando uma transação é autorizada em um contrato.

| Item | Valor |
| --- | --- |
| Producer | Authorization Service |
| Transporte | Amazon EventBridge → SQS (Accounting, Fraud, Notification) |
| Garantia de entrega | `AT-LEAST-ONCE` |
| Schema | [`schema.json`](./schema.json) (JSON Schema draft 2020-12) |
| Exemplo válido | [`example.json`](./example.json) |
| Exemplos inválidos | [`invalid-examples/`](./invalid-examples/) |

## Campos

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `event_id` | string (UUID) | sim | Identificador único do evento — base para idempotência |
| `event_type` | string | sim | Constante `"TransacaoAutorizada"` |
| `event_version` | string | sim | `MAJOR.MINOR`, pattern `^1\.\d+$` (inicial `1.0`) |
| `occurred_at` | string (date-time) | sim | ISO-8601/RFC 3339 em UTC (sufixo `Z`) |
| `id_autorizacao` | string | sim | Identificador da autorização |
| `id_contrato` | string | sim | Identificador do contrato |
| `valor` | number | sim | `> 0` |
| `saldo_reservado` | number | sim | Saldo reservado após a autorização |
| `correlation_id` | string | sim | Correlação ponta a ponta |
| `trace_id` | string \| null | não | Trace distribuído; `null` quando inativo |

## Política de `additionalProperties`

O schema usa **`additionalProperties: true`** (comportamento padrão do JSON Schema).

Decisão deliberada, para favorecer **backward compatibility**:

- Consumidores **devem ignorar campos desconhecidos** (tolerant reader).
- Campos novos **opcionais** podem ser adicionados em releases **MINOR** sem quebrar consumidores antigos — `additionalProperties: false` rejeitaria eventos válidos produzidos por uma versão mais nova do producer.
- A estricteza do contrato está nos campos **obrigatórios** e nas **restrições de tipo/formato** (const, pattern, exclusiveMinimum), que capturam violações reais de contrato.

## Compatibilidade de versão

- `event_version` aceita `1.x` (`^1\.\d+$`): dentro de v1, MINORs são retrocompatíveis.
- Consumidores de v1 devem aceitar qualquer `1.x` e falhar explicitamente em `2.x` (que viverá em `events/transacao-autorizada/v2/`).

## Relação com CloudEvents

A arquitetura alvo prevê envelope **CloudEvents 1.0**. O contrato atual (v1) é um payload *flat* que já carrega metadados equivalentes aos atributos CloudEvents — decisão tomada para preservar compatibilidade com os consumidores existentes, sem breaking change silencioso.

Mapeamento previsto para a convergência:

| Campo atual (payload) | Atributo CloudEvents | Observação |
| --- | --- | --- |
| `event_id` | `id` | Mesmo valor — mantém chave de idempotência |
| `event_type` | `type` | Ex.: `co.whoo-internet.finance.authorization.TransacaoAutorizada` |
| `event_version` | parte de `type` ou extensão `eventversion` | A definir na convergência |
| `occurred_at` | `time` | Já em RFC 3339 UTC |
| `correlation_id` | extensão `correlationid` | Extensão, não atributo core |
| `trace_id` | extensão `traceparent` | Compatível com W3C Trace Context |
| demais campos | `data` | Payload de negócio |

**Plano de convergência (não implementado):**

1. **v1 (atual):** payload flat. Producer e consumers usam os campos no corpo do evento.
2. **Fase de transição (minor em v1, anunciada):** producer passa a emitir envelope CloudEvents **com os mesmos campos duplicados no `data`** — a duplicação é intencional e temporária, permitindo que consumers antigos (leitura do payload) e novos (leitura do envelope) coexistam.
3. **v2:** payload de negócio puro em `data`, metadados exclusivamente no envelope CloudEvents. Mudança MAJOR, coordenada com todos os consumidores.

Nenhuma breaking change será introduzida em v1. Consulte [`docs/versioning.md`](../../../docs/versioning.md).

## Idempotência (consumidores)

A entrega é `AT-LEAST-ONCE`: duplicação e reentrega são esperadas. Consumidores devem:

- usar `event_id` como chave de deduplicação;
- usar `id_autorizacao` como chave de idempotência de negócio;
- ser tolerantes a campos desconhecidos (ver política acima).
