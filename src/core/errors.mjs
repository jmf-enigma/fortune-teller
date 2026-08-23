export class FortuneTellerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FortuneTellerError";
    this.code = code;
    this.details = details;
  }
}

export function asFortuneTellerError(error) {
  if (error instanceof FortuneTellerError) return error;
  const cause = typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
    ? error.code
    : typeof error?.name === "string" ? error.name : "unknown";
  return new FortuneTellerError("INTERNAL_ERROR", "an unexpected internal error occurred", { cause });
}
