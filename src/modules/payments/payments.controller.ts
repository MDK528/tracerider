import type { Request, Response } from "express"
import { ApiResponse } from "../../common/utils/apiResponse.js"
import { createOrderService, verifyPaymentService, getPaymentService } from "./payments.service.js"

const createOrderController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.bookingId)
    const order = await createOrderService(bookingId, req.user.id)
    ApiResponse.ok(res, "Razorpay order created", order)
}

const verifyPaymentController = async (req: Request, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
    const payment = await verifyPaymentService(razorpayOrderId, razorpayPaymentId, razorpaySignature, req.user.id)
    ApiResponse.ok(res, "Payment verified successfully", payment)
}

const getPaymentController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.bookingId)
    const payment = await getPaymentService(bookingId, req.user.id, req.user.role)
    ApiResponse.ok(res, "Payment fetched", payment)
}

export { createOrderController, verifyPaymentController, getPaymentController }