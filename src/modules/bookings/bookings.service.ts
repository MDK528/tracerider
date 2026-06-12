import crypto from "node:crypto"
import { eq, and, sql, inArray } from "drizzle-orm"
import { db } from "../../common/config/db.js"
import { bookingTable } from "./bookings.model.js"
import { driverInfoTable } from "../drivers/drivers.model.js"
import { ApiError } from "../../common/utils/apiError.js"
import type { CreateBookingType } from "./dto/createBooking.dto.js"
import { getIO } from "../realtime/realtime.js"
import { getUserSocket } from "../realtime/realtime.redis.js"
import { EVENTS } from "../realtime/realtime.events.js"


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

const calculateFare = (distanceKm: number): number => {
    const baseFare = 30
    const perKmRate = 5
    const totalRupees = baseFare + perKmRate * distanceKm
    return Math.round(totalRupees * 100)
}

const generateOtp = (): string => {
    return crypto.randomInt(1000, 9999).toString()
}

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

    const [availableDriver] = await db
        .select({ id: driverInfoTable.id })
        .from(driverInfoTable)
        .where(
            and(
                eq(driverInfoTable.isAvailable, true),
                eq(driverInfoTable.isVerified, true),
                sql`${sql.param(pickupCity)} = ANY(${driverInfoTable.serviceArea})`
            )
        )
        .limit(1)

    if (availableDriver) {
        const driverSocketId = await getUserSocket(availableDriver.id)
        if (driverSocketId) {
            getIO().to(driverSocketId).emit(EVENTS.NEW_RIDE_REQUEST, {
                bookingId: booking!.id,
                pickupCity,
                pickupLocation,
                dropLocation,
                fareAmount,
            })
        }
    }

    return booking
}

const getBookingService = async (bookingId: string, userId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found");

    if (booking.passengerId !== userId && booking.driverId !== userId) {
        throw ApiError.forbidden("You do not have access to this booking")
    }

    return booking
}

const getMyRidesService = async (passengerId: string) => {
    const rides = await db.select().from(bookingTable).where(eq(bookingTable.passengerId, passengerId))
    return rides
}

const getAvailableRequestsService = async (driverId: string) => {
    const [driver] = await db.select().from(driverInfoTable).where(eq(driverInfoTable.id, driverId))

    if (!driver?.id) throw ApiError.notfound("Driver profile not found");
    if (!driver.isVerified) throw ApiError.forbidden("Driver is not verified");
    if (!driver.isAvailable) throw ApiError.forbidden("Set yourself available first");

    const rides = await db
        .select()
        .from(bookingTable)
        .where(
            and(
                eq(bookingTable.status, "requested"),
                sql`${bookingTable.pickupCity} = ANY(${sql.param(driver.serviceArea)})`
            )
        )

    return rides
}

const getMyActiveRideService = async (driverId: string) => {
    const [booking] = await db
        .select()
        .from(bookingTable)
        .where(
            and(
                eq(bookingTable.driverId, driverId),
                inArray(bookingTable.status, ["driver_assigned", "driver_arriving", "in_progress"])
            )
        )

    return booking ?? null
}

const acceptRideService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found");
    if (booking.status !== "requested") throw ApiError.badRequest("Ride is no longer available");

    const [driver] = await db.select().from(driverInfoTable).where(eq(driverInfoTable.id, driverId))

    if (!driver?.id) throw ApiError.notfound("Driver profile not found");
    if (!driver.isVerified) throw ApiError.forbidden("Driver is not verified");
    if (!driver.isAvailable) throw ApiError.forbidden("Driver is not available");
    if (!driver.serviceArea.includes(booking.pickupCity)) {
        throw ApiError.forbidden("This ride is outside your service area")
    }

    const [updated] = await db
        .update(bookingTable)
        .set({ driverId, status: "driver_assigned", confirmedAt: new Date() })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status, driverId: bookingTable.driverId })

    await db.update(driverInfoTable).set({ isAvailable: false }).where(eq(driverInfoTable.id, driverId))

    const passengerSocketId = await getUserSocket(booking.passengerId)
    if (passengerSocketId) {
        getIO().to(passengerSocketId).emit(EVENTS.DRIVER_ASSIGNED, {
            bookingId,
            driverId,
        })
    }

    return updated
}

const rejectRideService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found");
    if (booking.status !== "requested") throw ApiError.badRequest("Ride is no longer available");
    if (booking.driverId !== null && booking.driverId !== driverId) {
        throw ApiError.forbidden("This ride was assigned to another driver")
    }

    return { message: "Ride rejected" }
}

const markArrivingService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found");
    if (booking.driverId !== driverId) throw ApiError.forbidden("Not your ride");
    if (booking.status !== "driver_assigned") throw ApiError.badRequest("Invalid status transition");

    const [updated] = await db
        .update(bookingTable)
        .set({ status: "driver_arriving" })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    const passengerSocketId = await getUserSocket(booking.passengerId)
    if (passengerSocketId) {
        getIO().to(passengerSocketId).emit(EVENTS.DRIVER_ARRIVING, { bookingId })
    }

    return updated
}

const verifyOtpService = async (bookingId: string, passengerId: string, otp: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found");
    if (booking.passengerId !== passengerId) throw ApiError.forbidden("Not your ride");
    if (booking.status !== "driver_arriving") throw ApiError.badRequest("Driver has not arrived yet");
    if (booking.otp !== otp) throw ApiError.badRequest("Invalid OTP");

    const [updated] = await db
        .update(bookingTable)
        .set({ status: "in_progress", otp: null })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    if (booking.driverId) {
        const driverSocketId = await getUserSocket(booking.driverId)
        if (driverSocketId) {
            getIO().to(driverSocketId).emit(EVENTS.RIDE_STARTED, { bookingId })
        }
    }

    return updated
}

const completeRideService = async (bookingId: string, driverId: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found");
    if (booking.driverId !== driverId) throw ApiError.forbidden("Not your ride");
    if (booking.status !== "in_progress") throw ApiError.badRequest("Ride is not in progress");

    const [updated] = await db
        .update(bookingTable)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status, fareAmount: bookingTable.fareAmount, paymentMethod: bookingTable.paymentMethod })

    await db
        .update(driverInfoTable)
        .set({ isAvailable: true, totalTrips: sql`${driverInfoTable.totalTrips} + 1` })
        .where(eq(driverInfoTable.id, driverId))

    const passengerSocketId = await getUserSocket(booking.passengerId)
    if (passengerSocketId) {
        getIO().to(passengerSocketId).emit(EVENTS.RIDE_COMPLETED, {
            bookingId,
            fareAmount: updated!.fareAmount,
            paymentMethod: updated!.paymentMethod,
        })
    }

    return updated
}

const cancelRideService = async (bookingId: string, userId: string, role: "passenger" | "driver", reason?: string) => {
    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))

    if (!booking?.id) throw ApiError.notfound("Booking not found")

    const cancellableStatuses = ["requested", "driver_assigned", "driver_arriving"]
    if (!cancellableStatuses.includes(booking.status)) {
        throw ApiError.badRequest("Ride cannot be cancelled at this stage")
    }

    if (role === "passenger" && booking.passengerId !== userId) throw ApiError.forbidden("Not your ride");
    if (role === "driver" && booking.driverId !== userId) throw ApiError.forbidden("Not your ride");

    const [updated] = await db
        .update(bookingTable)
        .set({
            status: "cancelled",
            cancelledBy: role,
            cancellationReason: reason?.trim() ?? null,
            cancelledAt: new Date()
        })
        .where(eq(bookingTable.id, bookingId))
        .returning({ id: bookingTable.id, status: bookingTable.status })

    if (booking.driverId) {
        await db.update(driverInfoTable).set({ isAvailable: true }).where(eq(driverInfoTable.id, booking.driverId))
    }

    if (role === "passenger" && booking.driverId) {
        const driverSocketId = await getUserSocket(booking.driverId)
        if (driverSocketId) {
            getIO().to(driverSocketId).emit(EVENTS.RIDE_CANCELLED, { bookingId })
        }
    }

    if (role === "driver") {
        const passengerSocketId = await getUserSocket(booking.passengerId)
        if (passengerSocketId) {
            getIO().to(passengerSocketId).emit(EVENTS.DRIVER_CANCELLED, { bookingId })
        }
    }

    return updated
}

export {
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
    cancelRideService
}