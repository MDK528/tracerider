import type { BaseDtoType } from "../dto/base.dto.js"
import { ApiError } from "../utils/apiError.js"
import type { NextFunction, Request, Response } from "express"

const validate = (Dtoclass: BaseDtoType) => {
    return (req:Request, res:Response, next:NextFunction) => {
        const result = Dtoclass.validate(req.body)
        if(result.error){
            throw ApiError.badRequest(result.error.map((e)=> e.message).join('; '))
        }
        req.body = result.data
        next()
    }
}

const validateParams = (schema: BaseDtoType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.validate(req.params)
        if(result.error) throw ApiError.badRequest(result.error.map(e => e.message).join('; '))
        next()
    }
}


export { validate, validateParams }