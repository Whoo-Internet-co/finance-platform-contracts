# ADR-001 — Centralização e distribuição dos contratos de integração

- Status: Accepted
- Date: 2026-09-23
- Decision Owners: Architecture Team
- Scope: Finance Platform

## Context

A plataforma de autorização financeira utiliza comunicação síncrona e
assíncrona entre serviços.

A comunicação síncrona possui contratos HTTP definidos através de OpenAPI.

A comunicação assíncrona utiliza eventos de domínio, inicialmente
`TransacaoAutorizada`, produzido pelo Authorization Service e consumido por
serviços como:

- Accounting Consumer
- Fraud Consumer
- Notification Consumer

A arquitetura utiliza entrega de eventos com semântica at-least-once.
Consumidores devem, portanto, suportar duplicação, reentrega e evolução
dos contratos.

Se cada producer ou consumer mantiver sua própria cópia do schema,
diferentes interpretações do mesmo contrato podem surgir ao longo do tempo.

Exemplo:

```
Authorization Service
    └── transacao-autorizada.schema.json

Fraud Consumer
    └── transacao-autorizada.schema.json

Notification Consumer
    └── transacao-autorizada.schema.json
```

Com evolução independente, essas cópias podem divergir, causando
contract drift e falhas que somente aparecem durante integração ou produção.

Além disso, o desafio arquitetural estabelece uma abordagem contract-first
para APIs e evolução retrocompatível dos schemas de eventos.

Precisamos, portanto, de uma única fonte de verdade para os contratos
públicos da plataforma.

## Decision

Será criado um repositório independente:

`finance-platform-contracts`

Esse repositório será a source of truth dos contratos públicos de
integração da plataforma.

Inicialmente armazenará:

- JSON Schemas dos eventos;
- exemplos válidos;
- exemplos inválidos utilizados para testes;
- contratos OpenAPI;
- documentação de versionamento e compatibilidade.

A estrutura inicial será:

```
finance-platform-contracts/
├── events/
│   └── transacao-autorizada/
│       └── v1/
│           ├── schema.json
│           └── example.json
└── openapi/
    └── authorization/
        └── v1/
            └── openapi.yaml
```

## Distribution

Os contratos serão distribuídos como um package npm versionado.

O package será publicado no GitHub Packages:

`@whoo-internet-co/finance-platform-contracts`

Os serviços deverão declarar explicitamente a versão utilizada.

Exemplo:

```json
"dependencies": {
  "@whoo-internet-co/finance-platform-contracts": "1.0.0"
}
```

Não será permitido que cada serviço mantenha uma versão canônica
independente do mesmo contrato.

Fixtures locais poderão existir exclusivamente para testes específicos,
desde que não sejam tratadas como source of truth.

## Schema as Source of Truth

JSON Schema será a representação canônica dos contratos de eventos.

Tipos TypeScript, quando necessários, deverão ser derivados ou gerados
a partir do schema.

Não serão mantidos manualmente JSON Schema e interfaces TypeScript
equivalentes como duas fontes independentes de verdade.

Isso reduz a possibilidade de contract drift dentro do próprio package.

## API Contracts

OpenAPI será a representação canônica dos contratos HTTP.

A implementação do Authorization Service deverá respeitar o OpenAPI
publicado pelo package.

Mudanças no contrato deverão ocorrer primeiro no repositório de contratos,
seguindo a abordagem contract-first.

## Producer Contract Testing

Producers deverão validar os eventos produzidos contra o schema oficial.

Exemplo:

```
Authorization Service
        |
        v
TransacaoAutorizada
        |
        v
Official JSON Schema
        |
        +--- valid ---> publish
        |
        +--- invalid -> test/build failure
```

Essa validação deverá existir no mínimo durante os testes automatizados.

## Consumer Contract Testing

Consumers deverão possuir testes que utilizem o contrato oficial.

Exemplo:

```
Official TransacaoAutorizada example/schema
        |
        v
Fraud Consumer
        |
        v
Consumer Contract Test
```

O mesmo padrão deverá ser aplicado a Accounting e Notification.

## Versioning

Os contratos seguirão Semantic Versioning.

### PATCH

Alterações que não modificam o contrato observável, como:

- documentação;
- correções editoriais;
- tooling.

### MINOR

Alterações backward-compatible, como:

- inclusão de campo opcional;
- inclusão de novos exemplos compatíveis.

### MAJOR

Breaking changes, como:

- remoção de campo;
- alteração incompatível de tipo;
- renomeação de campo;
- transformação de campo opcional em obrigatório;
- mudança incompatível de semântica.

Uma versão publicada será considerada imutável.

Uma versão existente do package não deverá ser sobrescrita.

## Event Versioning

A versão do package e a versão de um contrato são conceitos relacionados,
mas diferentes.

Exemplo:

Package:
`finance-platform-contracts@1.4.0`

pode conter:

```
events/transacao-autorizada/v1/schema.json
```

O diretório `v1` representa a major version do contrato do evento.

A versão `1.4.0` representa a versão do conjunto de contratos distribuído
pelo package.

Uma futura alteração incompatível do evento poderá resultar em:

```
events/transacao-autorizada/
├── v1/
│   └── schema.json
└── v2/
    └── schema.json
```

permitindo coexistência durante migração.

## Backward Compatibility

Mudanças em uma versão existente deverão preservar compatibilidade com
consumidores da mesma major version.

Consumidores devem seguir o princípio de tolerância a campos adicionais
compatíveis.

Por esse motivo, políticas excessivamente restritivas como
`additionalProperties: false` não deverão ser aplicadas indiscriminadamente
quando impedirem evolução aditiva do evento.

Breaking changes exigem nova major version do contrato.

## CloudEvents

Os eventos da plataforma deverão evoluir em direção à especificação
CloudEvents.

A distinção entre:

- envelope técnico CloudEvents;
- payload de negócio;

deverá permanecer explícita.

Mudanças necessárias para convergir contratos existentes para CloudEvents
não deverão introduzir breaking changes silenciosamente.

## GitHub Packages

GitHub Packages será utilizado como mecanismo inicial de distribuição.

A publicação ocorrerá através de GitHub Actions utilizando `GITHUB_TOKEN`.

Nenhuma credencial de publicação deverá ser armazenada no repositório.

Releases deverão utilizar tags SemVer.

Exemplo:

```
v1.0.0
```

A versão da Git tag e a versão do package deverão coincidir.

## AWS Schema Registry

O package npm e um AWS Schema Registry possuem responsabilidades
diferentes.

O Git repository/package é a source of truth durante:

- desenvolvimento;
- code review;
- CI;
- producer contract testing;
- consumer contract testing.

O Schema Registry AWS poderá ser utilizado durante execução/deployment
para governança e validação operacional dos schemas.

A integração com AWS Schema Registry será tratada pela infraestrutura
da plataforma e não pelo package de contratos.

## Alternatives Considered

### 1. Copiar schemas para cada serviço

Rejected.

Vantagem:

- simplicidade inicial.

Desvantagens:

- contract drift;
- múltiplas fontes de verdade;
- manutenção duplicada;
- difícil governança de versões.

### 2. Git Submodules

Rejected.

Vantagens:

- referência direta ao repositório de contratos.

Desvantagens:

- maior complexidade operacional no Git;
- necessidade de atualização explícita do submodule;
- pior experiência de CI/CD e desenvolvimento.

### 3. Biblioteca TypeScript compartilhando domínio

Rejected.

Vantagem:

- forte reutilização entre serviços Node.js.

Desvantagens:

- acoplamento tecnológico;
- risco de shared-domain library;
- redução da autonomia dos microsserviços;
- impossibilidade de consumidores Java/Go/Python utilizarem naturalmente
  o contrato.

O package poderá fornecer ergonomia para TypeScript, mas JSON Schema e
OpenAPI permanecerão os artefatos canônicos.

### 4. Apenas AWS Schema Registry

Rejected como única solução.

O registry em runtime não substitui:

- versionamento Git;
- pull requests;
- code review;
- contract testing local;
- validação durante CI;
- documentação de APIs.

AWS Schema Registry poderá complementar, e não substituir, o repositório
de contratos.

## Consequences

### Positive

- única source of truth;
- menor risco de contract drift;
- contratos versionados;
- builds reproduzíveis;
- contract-first development;
- producer contract testing;
- consumer contract testing;
- governança explícita;
- evolução controlada;
- independência entre contrato e implementação.

### Negative

- novo repositório precisa ser mantido;
- alteração de contrato exige processo adicional;
- serviços precisam atualizar explicitamente a dependência;
- GitHub Packages requer configuração do registry nos consumidores;
- packages privados podem exigir autenticação durante desenvolvimento e CI.

Esses custos são considerados aceitáveis devido ao nível de desacoplamento
e governança exigido pela plataforma financeira.

## Governance

Alterações em contratos públicos deverão:

1. ocorrer através de Pull Request;
2. passar pela validação automatizada;
3. avaliar backward compatibility;
4. receber revisão arquitetural;
5. respeitar Semantic Versioning;
6. gerar nova versão do package quando publicadas.

Breaking changes deverão criar uma nova major version do contrato.

## Consequence for Current Services

Os serviços:

- Authorization Service
- Fraud Consumer
- Notification Consumer
- Accounting Consumer

deverão consumir o package de contratos.

Fraud e Notification não serão proprietários do schema
`TransacaoAutorizada`.

O Authorization Service também não será proprietário exclusivo do contrato,
apesar de ser seu producer.

O contrato pertence à plataforma e é governado pelo repositório
`finance-platform-contracts`.

## Status

Accepted.
