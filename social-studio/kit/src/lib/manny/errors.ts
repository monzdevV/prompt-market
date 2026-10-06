import { ApiError } from "../errors";
import { MannyError } from "./llm";

/** Los fallos de Manny llegan al navegador con su mensaje (ya está escrito para enseñarse). */
export async function withManny<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof MannyError) throw new ApiError(503, e.retryable ? "manny_busy" : "manny_unavailable", e.message);
    throw e;
  }
}
