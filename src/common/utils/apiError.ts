export class ApiError extends Error {
    
    constructor(public statusCode: number, message: string) {
        super(message)
        this.statusCode = statusCode
        Error.captureStackTrace(this, this.constructor)
    }

    static badRequest(message = "Bad request") {
        return new ApiError(400, message);
    }

    static unauthorized(message = "Unauthorized") {
        return new ApiError(401, message);
    }

    static conflict(message = "Conflict") {
        return new ApiError(409, message);
    }

    static forbidden(message = "forbidden") {
        return new ApiError(403, message);
    }

    static notfound(message = "notfound") {
        return new ApiError(404, message);
    }

    static unprocessable(message = "unprocessable"){
        return new ApiError(422, message)
    }

    static internal(message = "Internal Server Error") {
        return new ApiError(500, message);
    }
}