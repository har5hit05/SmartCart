export class AppError extends Error {
    public statusCode: number;
    public code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

export class ValidationError extends AppError {
    public errors: Array<{ field: string; message: string }>;

    constructor(errors: Array<{ field: string; message: string }>) {
        super('Validation failed', 422, 'VALIDATION_ERROR');
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'TOO_MANY_REQUESTS');
    }
}

export class InternalError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR');
    }
}
