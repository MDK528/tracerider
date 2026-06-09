import crypto from "node:crypto"
import { eq, and, sql } from "drizzle-orm"
import { db } from "../../common/config/db.js"
import { bookingTable } from "./bookings.model.js"
import { driverInfoTable } from "../drivers/drivers.model.js"
import { ApiError } from "../../common/utils/apiError.js"
import type { CreateBookingType } from "./dto/createBooking.dto.js"

// Haversine formula — distance in km between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// Fare: base 30 + 5/km, converted to paise
const calculateFare = (distanceKm: number): number => {
    const baseFare = 30
    const perKmRate = 5
    const totalRupees = baseFare + perKmRate * distanceKm
    return Math.round(totalRupees * 100) // paise
}

const generateOtp = (): string => {
    return crypto.randomInt(1000, 9999).toString()
}

// ─── Create Booking ───────────────────────────────────────────────────────────

const createBookingService = async (passengerId: string, body: CreateBookingType) => {
    const { pickupCity, pickupLocation, dropLocation, pickupLat, pickupLng, dropLat, dropLng, paymentMethod } = body

    const distanceKm = calculateDistance(pickupLat, pickupLng, dropLat, dropLng)
    const fareAmount = calculateFare(distanceKm)
    const otp = generateOtp()

    const [booking] = await db.insert(bookingTable).values({
        passengerId,
        pickupCity,
        pickupLocation,
        dropLocation,
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        fareAmount,
        paymentMethod,
        otp
    }).returning({ id: bookingTable.id, fareAmount: bookingTable.fareAmount })

    return booking
}

// ─── Get Single Booking ───────────────────────────────────────────────────────

const getBookingService = async (bookingId: string, userId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")

    // only passenger or assigned driver can view
    if (booking.passengerId !== userId && booking.driverId !== userId) {
        throw ApiError.forbidden("You do not have access to this booking")
    }

    return booking
}

// ─── Passenger: My Rides ──────────────────────────────────────────────────────

const getMyRidesService = async (passengerId: string) => {
    const rides = await db.select().from(bookingTable).where(eq(bookingTable.passengerId, passengerId))
    return rides
}

// ─── Driver: Available Requests in Service Area ───────────────────────────────

const getAvailableRequestsService = async (driverId: string) => {
    const [driver] = await db.select().from(driverInfoTable).where(eq(driverInfoTable.id, driverId))

    if (!driver?.id) throw ApiError.notfound("Driver profile not found")
    if (!driver.isVerified) throw ApiError.forbidden("Driver is not verified")
    if (!driver.isAvailable) throw ApiError.forbidden("Set yourself available first")

    const rides = await db
        .select()
        .from(bookingTable)
        .where(
            and(
                eq(bookingTable.status, "requested"),
                sql`${bookingTable.pickupCity} = ANY(${driverInfoTable.serviceArea})`
            )
        )

    return rides
}

// ─── Driver: Accept Ride ──────────────────────────────────────────────────────

const acceptRideService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")
    if (booking.status !== "requested") throw ApiError.badRequest("Ride is no longer available")

    const [driver] = await db.select().from(driverInfoTable).where(eq(driverInfoTable.id, driverId))

    if (!driver?.id) throw ApiError.notfound("Driver profile not found")
    if (!driver.isVerified) throw ApiError.forbidden("Driver is not verified")
    if (!driver.isAvailable) throw ApiError.forbidden("Driver is not available")
    if (!driver.serviceArea.includes(booking.pickupCity)) {
        throw ApiError.forbidden("This ride is outside your service area")
    }

    const [updated] = await db
        .update(bookingTable)
        .set({ driverId, status: "driver_assigned", confirmedAt: new Date() })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    // mark driver unavailable
    await db.update(driverInfoTable).set({ isAvailable: false }).where(eq(driverInfoTable.id, driverId))

    return updated
}

// ─── Driver: Reject Ride ──────────────────────────────────────────────────────

const rejectRideService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")
    if (booking.status !== "requested") throw ApiError.badRequest("Ride is no longer available")
    if (booking.driverId !== null && booking.driverId !== driverId) {
        throw ApiError.forbidden("This ride was assigned to another driver")
    }

    // just leave it as "requested" so another driver can pick it up
    // no status change needed — driver simply skips it
    return { message: "Ride rejected" }
}

// ─── Driver: Mark Arriving ────────────────────────────────────────────────────

const markArrivingService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")
    if (booking.driverId !== driverId) throw ApiError.forbidden("Not your ride")
    if (booking.status !== "driver_assigned") throw ApiError.badRequest("Invalid status transition")

    const [updated] = await db
        .update(bookingTable)
        .set({ status: "driver_arriving" })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    return updated
}

// ─── Passenger: Verify OTP ────────────────────────────────────────────────────

const verifyOtpService = async (bookingId: string, passengerId: string, otp: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")
    if (booking.passengerId !== passengerId) throw ApiError.forbidden("Not your ride")
    if (booking.status !== "driver_arriving") throw ApiError.badRequest("Driver has not arrived yet")
    if (booking.otp !== otp) throw ApiError.badRequest("Invalid OTP")

    const [updated] = await db
        .update(bookingTable)
        .set({ status: "in_progress", otp: null })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    return updated
}

// ─── Driver: Complete Ride ────────────────────────────────────────────────────

const completeRideService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")
    if (booking.driverId !== driverId) throw ApiError.forbidden("Not your ride")
    if (booking.status !== "in_progress") throw ApiError.badRequest("Ride is not in progress")

    const [updated] = await db
        .update(bookingTable)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status, fareAmount: bookingTable.fareAmount })

    // mark driver available again
    await db.update(driverInfoTable).set({ isAvailable: true, totalTrips: sql`${driverInfoTable.totalTrips} + 1` }).where(eq(driverInfoTable.id, driverId))

    return updated
}

// ─── Cancel Ride ──────────────────────────────────────────────────────────────

const cancelRideService = async (bookingId: string, userId: string, role: "passenger" | "driver", reason?: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")

    const cancellableStatuses = ["requested", "driver_assigned", "driver_arriving"]
    if (!cancellableStatuses.includes(booking.status)) {
        throw ApiError.badRequest("Ride cannot be cancelled at this stage")
    }

    if (role === "passenger" && booking.passengerId !== userId) throw ApiError.forbidden("Not your ride")
    if (role === "driver" && booking.driverId !== userId) throw ApiError.forbidden("Not your ride")

    const [updated] = await db
        .update(bookingTable)
        .set({
            status: "cancelled",
            cancelledBy: role,
            cancellationReason: reason ?? null,
            cancelledAt: new Date()
        })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    // free up driver if one was assigned
    if (booking.driverId) {
        await db.update(driverInfoTable).set({ isAvailable: true }).where(eq(driverInfoTable.id, booking.driverId))
    }

    return updated
}

export {
    createBookingService,
    getBookingService,
    getMyRidesService,
    getAvailableRequestsService,
    acceptRideService,
    rejectRideService,
    markArrivingService,
    verifyOtpService,
    completeRideService,
    cancelRideService
}