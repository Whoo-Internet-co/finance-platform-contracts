# CloudEvents 1.0 — Mapeamento de `TransacaoAutorizada` v1

- **Status:** Documento de referência (sem mudança de contrato)
- **Escopo:** Finance Platform — eventos
- **Decisão de arquitetura:** [ADR-008 — centralização e distribuição dos contratos](../docs/adr/ADR-001-centralized-contract-registry.md) (seção *CloudEvents*)

Este documento descreve **como o evento `TransacaoAutorizada` v1 é exposto no
formato CloudEvents 1.0** pelo transporte da plataforma (Amazon EventBridge),
mantendo a distinção explícita entre:

- **envelope técnico CloudEvents** — atributos de transporte aplicados pelo
  adapter de publicação; **não faz parte do contrato de negócio** definido no
  `schema.json`; e
- **payload de negócio** — corpo do evento definido pelo JSON Schema
  ([`events/transacao-autorizada/v1/schema.json`](../events/transacao-autorizada/v1/schema.json)),
  que é a **source of truth** e permanece inalterado.

O `schema.json` **não é alterado** para conter o envelope. O envelope é uma
camada de transporte (técnica), aplicada na publicação, conforme ADR-008:

> A distinção entre envelope técnico CloudEvents e payload de negócio deverá
> permanecer explícita. Mudanças de representação não poderão introduzir
> breaking changes silenciosamente.

## Princípio

- **Envelope técnico ≠ payload de negócio.**
- O payload de negócio (o que o schema valida) é o que os consumidores usam
  para regra de negócio e idempotência.
- O envelope é produzido/consumido pelo adapter de publicação/consumo — uma
  responsabilidade de infraestrutura do producer/consumers, **não** do
  contrato de negócio.
- Convergência futura (envelope puro em `data`, v2) será uma mudança MAJOR
  coordenada — ver [events/transacao-autorizada/v1/README.md](../events/transacao-autorizada/v1/README.md).

## Mapeamento de atributos CloudEvents 1.0

O adapter de publicação mapeia os campos do payload para os atributos do
envelope CloudEvents **1.0**:

| Atributo CloudEvents | Origem | Observação |
| --- | --- | --- |
| `specversion` | constante | Fixo em `1.0`. |
| `id` | `event_id` | Mesmo valor (UUID) — preserva a chave de idempotência/deduplicação (`at-least-once`). |
| `source` | constante do serviço | Ex.: `/finance/authorization-service` (o Authorization Service é o producer). |
| `type` | `event_type` | Ex.: `TransacaoAutorizada`; pode ser qualificado (`co.whoo-internet.finance.authorization.TransacaoAutorizada`) conforme convenção da plataforma. |
| `time` | `occurred_at` | Já em RFC 3339 UTC (o schema exige sufixo `Z`). |
| `datacontenttype` | constante | `application/json`. |
| `data` | payload de negócio | Corpo do evento conforme `schema.json` (todos os campos de negócio, **incluindo** `event_id`, `event_type`, `occurred_at`, etc. — ver abaixo). |

### Atributos opcionais / extensões

| Atributo / extensão | Origem | Observação |
| --- | --- | --- |
| `correlationid` (extensão) | `correlation_id` | Extensão, não atributo core. |
| `traceparent` (extensão) | `trace_id` | Alinhado a W3C Trace Context quando tracing ativo. |
| `subject` (opcional) | `id_contrato` | Pode ser usado para roteamento/filtragem por contrato. |

### Exemplo de envelope (aplicado pelo adapter na publicação)

```json
{
  "specversion": "1.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "/finance/authorization-service",
  "type": "TransacaoAutorizada",
  "time": "2026-09-23T20:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_type": "TransacaoAutorizada",
    "event_version": "1.0",
    "occurred_at": "2026-09-23T20:00:00Z",
    "id_autorizacao": "AUT-001",
    "id_contrato": "CTR-001",
    "valor": 100.0,
    "saldo_reservado": 900.0,
    "correlation_id": "CORR-001",
    "trace_id": null
  }
}
```

> O `data` é **exatamente** o payload validado pelo `schema.json` — os
> atributos do envelope **duplicam** metadados já presentes no payload
> (`event_id`/`id`, `occurred_at`/`time`, `event_type`/`type`). Essa
> duplicação é intencional e temporária (fase de transição do v1): permite que
> consumers legados leiam o payload e consumers novos leiam o envelope,
> coexistindo sem breaking change. Não é esquema canônico — o `schema.json`
> permanece a única definição do payload de negócio.

## Implementação no transporte (Amazon EventBridge)

O envelope CloudEvents **não** é embutido no payload. O adapter de publicação
do Authorization Service aplica o mapeamento nas primitivas do EventBridge
(`PutEvents`):

| Primitiva EventBridge | Origem | Exemplo |
| --- | --- | --- |
| `Source` | constante do serviço | `finance.authorization` |
| `DetailType` | `event_type` | `TransacaoAutorizada` |
| `Time` | `occurred_at` | `2026-09-23T20:00:00Z` |
| `Detail` | payload de negócio (JSON) | corpo validado pelo `schema.json` |

O `id` do envelope corresponde ao `event_id` do payload e ao identificador
usado pelos consumidores para deduplicação (entrega `at-least-once` via
EventBridge → SQS).

**Consumidores (Accounting, Fraud, Notification):** desserializam o `Detail`
e validam contra o `schema.json` oficial (versão pinada do package). Se um
futuro consumo via envelope CloudEvents for necessário, o mesmo `data` é
validado — o contrato de negócio não muda.

## O que NÃO muda

- `schema.json`, `example.json` e os tipos gerados: **inalterados**.
- O contrato de negócio permanece o payload flat de v1.
- Nenhuma breaking change é introduzida em v1 (SemVer — ver
  [`docs/versioning.md`](./versioning.md)).
- Envelope puro em `data` (payload de negócio sem metadados) fica para a v2
  (MAJOR), coordenada com todos os consumidores.

## Referências

- [ADR-008 — centralização e distribuição dos contratos](../docs/adr/ADR-001-centralized-contract-registry.md) (seção CloudEvents)
- [events/transacao-autorizada/v1/README.md](../events/transacao-autorizada/v1/README.md) (seção *Relação com CloudEvents*)
- [schema.json](../events/transacao-autorizada/v1/schema.json)
- [CloudEvents 1.0 spec](https://github.com/cloudevents/spec/blob/v1.0.1/cloudevents/spec.md)