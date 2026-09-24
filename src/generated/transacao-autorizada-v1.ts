/**
 * ARQUIVO GERADO AUTOMATICAMENTE — NÃO EDITAR.
 * Derivado de events/transacao-autorizada/v1/schema.json (source of truth).
 * Regenerar com: npm run generate:types
 */
/**
 * Evento publicado pelo Authorization Service quando uma transação é autorizada. Contrato público da plataforma — source of truth: finance-platform-contracts.
 */
export interface TransacaoAutorizada {
/**
 * Identificador único do evento. Base para idempotência nos consumidores (entrega at-least-once).
 */
event_id: string
/**
 * Tipo do evento. Valor constante.
 */
event_type: "TransacaoAutorizada"
/**
 * Versão do contrato (MAJOR.MINOR). Alterações MINOR são retrocompatíveis; mudança de MAJOR exige nova pasta de versão (v2).
 */
event_version: string
/**
 * Instante em que a autorização ocorreu, ISO-8601 / RFC 3339 em UTC (sufixo Z obrigatório).
 */
occurred_at: string
/**
 * Identificador da autorização gerado pelo Authorization Service.
 */
id_autorizacao: string
/**
 * Identificador do contrato ao qual a transação pertence.
 */
id_contrato: string
/**
 * Valor da transação autorizada. Deve ser estritamente positivo.
 */
valor: number
/**
 * Saldo reservado no contrato após a autorização.
 */
saldo_reservado: number
/**
 * Identificador de correlação para rastreamento ponta a ponta.
 */
correlation_id: string
/**
 * Identificador de trace distribuído (opcional). Pode ser null quando tracing não estiver ativo.
 */
trace_id?: (string | null)
[k: string]: unknown
}
