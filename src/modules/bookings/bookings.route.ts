import { Router } from "express"
import { authenticate, authorize } from "../auth/auth.middleware.js"
import { validate, validateParams } from "../../common/middleware/validate.middleware.js"
import UUIDParams from "../../common/dto/uuidParams.dto.js"
import CreateBooking from "./dto/createBooking.dto.js"
import VerifyOtp from "./dto/verifyOtp.dto.js"
import CancelBooking from "./dto/cancelBooking.dto.js"
import {
    createBookingController,
    getBookingController,
    getMyRidesController,
    getAvailableRequestsController,
    acceptRideController,
    rejectRideController,
    markArrivingController,
    verifyOtpController,
    completeRideController,
    cancelRideController
} from "./bookings.controller.js"

const router: Router = Router()

router.post("/", authenticate, authorize("passenger"), validate(CreateBooking), createBookingController)
router.get("/my-rides", authenticate, authorize("passenger"), getMyRidesController)
router.post("/:id/verify-otp", authenticate, authorize("passenger"), validateParams(UUIDParams), validate(VerifyOtp), verifyOtpController)

router.get("/available", authenticate, authorize("driver"), getAvailableRequestsController)
router.patch("/:id/accept", authenticate, authorize("driver"), validateParams(UUIDParams), acceptRideController)
router.patch("/:id/reject", authenticate, authorize("driver"), validateParams(UUIDParams), rejectRideController)
router.patch("/:id/arrive", authenticate, authorize("driver"), validateParams(UUIDParams), markArrivingController)
router.patch("/:id/complete", authenticate, authorize("driver"), validateParams(UUIDParams), completeRideController)

router.get("/:id", authenticate, validateParams(UUIDParams), getBookingController)
router.patch("/:id/cancel", authenticate, validateParams(UUIDParams), validate(CancelBooking), cancelRideController)

export default router