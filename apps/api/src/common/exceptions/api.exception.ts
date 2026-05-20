export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint: string;
}

export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly userMessage: string,
    public readonly details?: ValidationErrorDetail[],
  ) {
    super(userMessage);
    this.name = 'ApiException';
  }
}
