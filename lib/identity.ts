/**
 * Identifying details of the client are never stored in the repository.
 * They come from the DASHBOARD_IDENTITY environment variable (a JSON object with
 * the keys below) and are sent only to signed-in users. Everyone else sees these
 * neutral placeholders.
 */
export interface Identity {
  /** Organisation name */
  name: string
  /** Registration / account references */
  reference: string
  /** City or locality */
  location: string
  /** Related entity excluded from scope, with its holdings */
  relatedEntity: string
  /** Name of the portfolio statement used as evidence */
  statementSource: string
  /** Distributor / adviser on the Regular plans */
  adviser: string
}

export const REDACTED_IDENTITY: Identity = {
  name: "Client trust",
  reference: "Reference hidden",
  location: "Maharashtra",
  relatedEntity: "A related entity (details hidden)",
  statementSource: "the adviser's portfolio statement",
  adviser: "name hidden",
}

const TOKEN = /\{(name|reference|location|relatedEntity|statementSource|adviser)\}/g

/** Replace {name}, {location} … placeholders in data strings. */
export function fillIdentity(text: string, identity: Identity) {
  return text.replace(TOKEN, (_, key: keyof Identity) => identity[key])
}
