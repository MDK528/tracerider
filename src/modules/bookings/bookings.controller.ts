import type { Request, Response } from "express"
import { ApiResponse } from "../../common/utils/apiResponse.js"
import {
    createBookingService,
    getBookingService,
    getMyRidesService,
    getAvailableRequestsService,
    getMyActiveRideService,
    acceptRideService,
    rejectRideService,
    markArrivingService,
    verifyOtpService,
    completeRideService,
    cancelRideService,
    getShareTokenService,
    getPassengerActiveRideService,
} from "./bookings.service.js"

const createBookingController = async (req: Request, res: Response) => {
    const booking = await createBookingService(req.user.id, req.body)
    ApiResponse.created(res, "Ride requested successfully", booking)
}

const getBookingController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const booking = await getBookingService(bookingId, req.user.id)
    ApiResponse.ok(res, "Booking fetched successfully", booking)
}

const getMyRidesController = async (req: Request, res: Response) => {
    const rides = await getMyRidesService(req.user.id)
    ApiResponse.ok(res, "Rides fetched successfully", rides)
}

const getAvailableRequestsController = async (req: Request, res: Response) => {
    const rides = await getAvailableRequestsService(req.user.id)
    ApiResponse.ok(res, "Available ride requests fetched", rides)
}

const getMyActiveRideController = async (req: Request, res: Response) => {
    const booking = await getMyActiveRideService(req.user.id)
    ApiResponse.ok(res, booking ? "Active ride fetched successfully" : "No active ride", booking)
}

const getPassengerActiveRideController = async (req: Request, res: Response) => {
    const booking = await getPassengerActiveRideService(req.user.id)
    ApiResponse.ok(res, booking ? "Active ride fetched" : "No active ride", booking)
}

const acceptRideController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const booking = await acceptRideService(bookingId, req.user.id)
    ApiResponse.ok(res, "Ride accepted successfully", booking)
}

const rejectRideController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const result = await rejectRideService(bookingId, req.user.id)
    ApiResponse.ok(res, result.message)
}

const markArrivingController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const booking = await markArrivingService(bookingId, req.user.id)
    ApiResponse.ok(res, "Marked as arriving", booking)
}

const verifyOtpController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const booking = await verifyOtpService(bookingId, req.user.id, req.body.otp)
    ApiResponse.ok(res, "OTP verified, ride started", booking)
}

const completeRideController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const booking = await completeRideService(bookingId, req.user.id)
    ApiResponse.ok(res, "Ride completed successfully", booking)
}

const cancelRideController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const booking = await cancelRideService(
        bookingId,
        req.user.id,
        req.user.role as "passenger" | "driver",
        req.body.reason
    )
    ApiResponse.ok(res, "Ride cancelled successfully", booking)
}

const getShareTokenController = async (req: Request, res: Response) => {
    const bookingId = String(req.params.id)
    const result = await getShareTokenService(bookingId, req.user.id)
    ApiResponse.ok(res, "Share token generated", result)
}

export {
    createBookingController,
    getBookingController,
    getMyRidesController,
    getAvailableRequestsController,
    getMyActiveRideController,
    acceptRideController,
    rejectRideController,
    markArrivingController,
    verifyOtpController,
    completeRideController,
    cancelRideController,
    getShareTokenController,
    getPassengerActiveRideController
}