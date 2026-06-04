import express from "express";
import type{ Express, NextFunction, Request, Response } from "express";
import { ApiError } from "./common/utils/apiError.js";

const app: Express = express();

app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use((err: any, req: Request, res: Response, next: NextFunction) => {

    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
        return
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    })

})

export default app;