declare global {
  interface ErrorConstructor {
    captureStackTrace(
      targetObject: object,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructorOpt?: new (...args: any[]) => object,
    ): void;
  }
}

class RequestError extends Error {
  status: number;
  attempt: number;

  constructor(status: number, message: string, attempt: number) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.attempt = attempt;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RequestError);
    }

    // Ensures proper prototype chain in Node.js
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(couldBeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(couldBeError)) return couldBeError;

  try {
    if (typeof couldBeError === "string") {
      return new Error(couldBeError);
    }
    return new Error(JSON.stringify(couldBeError));
  } catch {
    return new Error(String(couldBeError));
  }
}

function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

export { getErrorMessage, RequestError };
