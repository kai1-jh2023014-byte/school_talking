/** Official TypeSafe SDK env names and defaults. */

export const TYPESAFE_API_KEY_ENV = "TYPESAFE_API_KEY";
export const TYPESAFE_BASE_URL_ENV = "TYPESAFE_BASE_URL";
export const TYPESAFE_DEFAULT_MODEL_ENV = "TYPESAFE_DEFAULT_MODEL";

export const DEFAULT_BASE_URL = "https://api.typesafe.ai";

/** Existing classify path uses 4s. Official SDK default is 10s. */
export const DEFAULT_TIMEOUT_MS = Number(process.env.TYPESAFE_TIMEOUT_MS || 4000);

/** Official Confidence page: below 0.5 means "don't guess". */
export const SUBJECT_CONFIDENCE_FLOOR = 0.5;

/** Official routing example uses ~0.75+ for automatic action on a recoverable decision. */
export const SUBJECT_CONFIDENCE_HIGH = 0.75;

/** Winning Choice probability must also be clearly ahead of the rest. */
export const SUBJECT_PROBABILITY_CLEAR = 0.55;

export const TOPIC_CONFIDENCE_ACCEPT = 0.5;
export const URGENCY_CONFIDENCE_ACCEPT = 0.6;

/** Companion Noul: is this actually a catalog subject? */
export const IN_CATALOG_NOUL_ACCEPT = 0.55;

/** Official: retry 429/529 with backoff. Never unlimited. */
export const MAX_OVERLOAD_RETRIES = 1;
