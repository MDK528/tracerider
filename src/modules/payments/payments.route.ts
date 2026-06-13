import { Router } from "express"
import { authenticate, authorize } from "../auth/auth.middleware.js"
import { validateParams } from "../../common/middleware/validate.middleware.js"
import { BookingIdParams } from "../../common/dto/uuidParams.dto.js"
import { validate } from "../../common/middleware/validate.middleware.js"
import BaseDto from "../../common/dto/base.dto.js"
import { z } from "zod"
import { createOrderController, verifyPaymentController, getPaymentController } from "./payments.controller.js"

class VerifyPayment extends BaseDto {
    static schema = z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
    })
}

const router: Router = Router()

router.post("/create-order/:bookingId", authenticate, authorize("passenger"), validateParams(BookingIdParams), createOrderController)
router.post("/verify", authenticate, authorize("passenger"), validate(VerifyPayment), verifyPaymentController)
router.get("/:bookingId", authenticate, authorize("passenger", "driver"), validateParams(BookingIdParams), getPaymentController)

export default router