import express from "express";
import type{ Express, NextFunction, Request, Response } from "express";
import { ApiError } from "./common/utils/apiError.js";
import cookiParser from "cookie-parser";
import cors from "cors";
import authRoute from "./modules/auth/auth.route.js";
import bookingRoute from "./modules/bookings/bookings.route.js";
import driverRoute from "./modules/drivers/drivers.route.js"

const app: Express = express();

app.use(cookiParser())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

app.get("/", (req, res)=>{
    res.json({
        success: true,
        message: "healthy"
    })
})

app.use("/api/v1/auth", authRoute)
app.use("/api/v1/bookings", bookingRoute)
app.use("/api/v1/drivers", driverRoute)

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
        message: "Internal server error"
    })

})

export default app;