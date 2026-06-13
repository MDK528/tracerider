import Razorpay from "razorpay"
import crypto from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "../../common/config/db.js"
import { ApiError } from "../../common/utils/apiError.js"
import { paymentsTable } from "./payments.model.js"
import { bookingTable } from "../bookings/bookings.model.js"

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const createOrderService = async (bookingId: string, passengerId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")
    if (booking.passengerId !== passengerId) throw ApiError.forbidden("Not your booking")
    if (booking.status !== "completed") throw ApiError.badRequest("Ride must be completed before payment")

    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, bookingId))

    if (!payment?.id) throw ApiError.notfound("Payment record not found")
    if (payment.method !== "razorpay") throw ApiError.badRequest("This booking uses cash payment")
    if (payment.status === "success") throw ApiError.conflict("Payment already completed")

    // fareAmount is stored in paise already
    const order = await razorpay.orders.create({
        amount: booking.fareAmount,
        currency: "INR",
        receipt: `receipt_${bookingId.slice(0, 8)}`,
    })

    await db.update(paymentsTable)
        .set({ transactionId: order.id })
        .where(eq(paymentsTable.bookingId, bookingId))

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID!,
    }
}

const verifyPaymentService = async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    passengerId: string
) => {
    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex")

    if (expectedSignature !== razorpaySignature) throw ApiError.badRequest("Invalid payment signature")

    const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.transactionId, razorpayOrderId))

    if (!payment?.id) throw ApiError.notfound("Payment record not found")

    // Verify this belongs to the requesting passenger
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, payment.bookingId))
    if (booking?.passengerId !== passengerId) throw ApiError.forbidden("Not your payment")

    const [updated] = await db
        .update(paymentsTable)
        .set({ status: "success", transactionId: razorpayPaymentId })
        .where(eq(paymentsTable.id, payment.id))
        .returning({ id: paymentsTable.id, status: paymentsTable.status })

    return updated
}

const getPaymentService = async (bookingId: string, userId: string, role: "passenger" | "driver" | "admin") => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")

    if (role === "passenger" && booking.passengerId !== userId) throw ApiError.forbidden("Not your booking")
    if (role === "driver" && booking.driverId !== userId) throw ApiError.forbidden("Not your booking")

    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.bookingId, bookingId))

    if (!payment?.id) throw ApiError.notfound("Payment not found")

    return payment
}

export { createOrderService, verifyPaymentService, getPaymentService }