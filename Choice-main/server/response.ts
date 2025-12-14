/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a standardized success response
 * @param data The response payload
 * @param message Optional success message
 * @returns Formatted success response
 */
export function success<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create a standardized error response
 * @param message Error message
 * @param statusCode HTTP status code (optional, for reference)
 * @returns Formatted error response
 */
export function error(
  message: string,
  statusCode?: number
): ErrorResponse {
  return {
    success: false,
    error: message,
  };
}
