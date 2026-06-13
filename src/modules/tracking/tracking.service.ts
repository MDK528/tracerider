import { eq } from "drizzle-orm"
import { db } from "../../common/config/db.js"
import { bookingTable } from "../bookings/bookings.model.js"
import { driverInfoTable } from "../drivers/drivers.model.js"
import { usersTable } from "../auth/auth.model.js"
import { ApiError } from "../../common/utils/apiError.js"
import { verifyShareToken } from "../../common/utils/jwt.js"
import { getDriverLocation } from "../realtime/realtime.redis.js"

const getTrackingInfoService = async (token: string) => {
    let bookingId: string

    try {
        ({ bookingId } = verifyShareToken(token))
    } catch {
        throw ApiError.unauthorized("Invalid or expired tracking link")
    }

    const [booking] = await db.select().from(bookingTable).where(eq(bookingTable.id, bookingId))
    if (!booking?.id) throw ApiError.notfound("Ride not found")

    let driver: { fullName: string; vehicleModel: string; vehicleNo: string } | null = null
    let liveLocation: { lat: number; lng: number } | null = null

    if (booking.driverId) {
        const [driverRow] = await db
            .select({
                fullName: usersTable.fullName,
                vehicleModel: driverInfoTable.vehicleModel,
                vehicleNo: driverInfoTable.vehicleNo,
            })
            .from(driverInfoTable)
            .innerJoin(usersTable, eq(driverInfoTable.id, usersTable.id))
            .where(eq(driverInfoTable.id, booking.driverId))

        driver = driverRow ?? null
        liveLocation = await getDriverLocation(booking.driverId)
    }

    return {
        id: booking.id,
        status: booking.status,
        pickupLocation: booking.pickupLocation,
        dropLocation: booking.dropLocation,
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
        dropLat: booking.dropLat,
        dropLng: booking.dropLng,
        driver,
        liveLocation,
    }
}

export { getTrackingInfoService }