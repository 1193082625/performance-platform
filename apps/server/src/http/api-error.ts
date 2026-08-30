import type { ApiErrorCode, ApiErrorResponse } from "@performance-platform/protocol";

export function createApiErrorResponse(
    code: ApiErrorCode,
    message: string,
    requestId: string
): ApiErrorResponse {
    return {
        error: {
            code,
            message,
            requestId
        }
    }
}