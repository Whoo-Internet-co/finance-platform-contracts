# Versionamento

Este repositório segue **Semantic Versioning (SemVer) 2.0.0**, aplicado aos
contratos públicos e ao package npm `@whoo-internet-co/finance-platform-contracts`.

Formato: `MAJOR.MINOR.PATCH` — tags Git no formato `vX.Y.Z` (ex.: `v1.0.0`).
A versão do `package.json` deve ser idêntica à tag (o workflow de publicação
falha se divergirem).

## Política

### PATCH (`1.0.x`)

Mudanças que **não alteram o contrato observável**:

- documentação e comentários;
- correções de descrições/exemplos textuais;
- novos exemplos válidos compatíveis com o schema vigente;
- correções de tooling, CI e testes.

### MINOR (`1.x.0`)

Mudanças **backward-compatible** — consumidores antigos continuam funcionando
sem alteração:

- novos campos **opcionais** em eventos (o schema permite
  `additionalProperties: true` e consumidores devem ser tolerant readers);
- novos exemplos compatíveis;
- novos endpoints/operações opcionais no OpenAPI;
- novos códigos de resposta documentados;
- relaxamento de restrições (ex.: aceitar mais valores em um campo opcional);
- incremento de `event_version` dentro do mesmo MAJOR (`1.0` → `1.1`).

### MAJOR (`x.0.0`)

**Breaking changes** — exigem ação coordenada dos consumidores:

- remoção de campos;
- alteração incompatível de tipo (ex.: `string` → `number`);
- transformação de campo opcional em obrigatório;
- mudança incompatível de semântica (ex.: significado de `valor`);
- remoção de endpoints/operações;
- mudança de `additionalProperties` para `false`;
- alteração de `const`/`enum`/`pattern` de campos existentes.

Breaking changes em eventos criam uma **nova pasta de versão**
(`events/<evento>/v2/`), mantendo a anterior intacta durante a migração.

## Regras duras

1. **Uma versão publicada nunca é sobrescrita.** O workflow de publicação
   falha se a versão já existir no GitHub Packages.
2. **Não há breaking change silenciosa em v1.** Qualquer PR que quebre
   compatibilidade dentro de v1 deve ser rejeitado na revisão.
3. A **verificação automatizada de compatibilidade**
   (`tests/compatibility/`) compara o schema atual com o baseline `1.0.0` e
   bloqueia: remoção de campos obrigatórios, mudança de tipo, novos campos
   obrigatórios, endurecimento de `additionalProperties`, mudança de
   `const`/`enum`/`pattern`.
   **Limitação:** é uma verificação conservadora e parcial — não prova
   compatibilidade total (ex.: não detecta `minimum` mais restritivo).
   A garantia final é a revisão arquitetural obrigatória no PR.
4. Mudanças em `/events/` e `/openapi/` exigem aprovação dos CODEOWNERS.

## Processo de release

1. PR com a mudança + atualização de `package.json` (`version`) conforme a
   política acima;
2. CI verde (`validate.yml`) + aprovação dos CODEOWNERS;
3. Merge na `main`;
4. Criar tag `vX.Y.Z` (idêntica ao `package.json`) na `main`;
5. `publish.yml` valida tudo novamente, confere tag == versão e publica no
   GitHub Packages.
