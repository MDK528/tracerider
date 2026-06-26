import express from "express";
import cors from "cors";
import type{ Express, NextFunction, Request, Response } from "express";
import { ApiError } from "./common/utils/apiError.js";
import cookiParser from "cookie-parser";
import authRoute from "./modules/auth/auth.route.js";
import bookingRoute from "./modules/bookings/bookings.route.js";
import driverRoute from "./modules/drivers/drivers.route.js"
import trackingRoute from "./modules/tracking/tracking.route.js"
import paymentsRoute from "./modules/payments/payments.route.js"
import { getTrackingPageHtml } from "./modules/tracking/trackingPage.js"


const app: Express = express();

app.use(cookiParser())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors({
    origin: process.env.CLIENT_URL,
    // origin : "*",
    credentials: true
}))

app.get("/", (req, res)=>{
    res.json({
        success: true,
        message: "healthy",
        version: "1.0.2"
    })
})


app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.originalUrl);
  next();
});

app.use("/api/v1/auth", authRoute)
app.use("/api/v1/bookings", bookingRoute)
app.use("/api/v1/drivers", driverRoute)
app.use("/api/v1/tracking", trackingRoute)
app.use("/api/v1/payments", paymentsRoute)

app.get("/track/:token", (req, res) => {
    res.type("html").send(getTrackingPageHtml(String(req.params.token)))
})


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