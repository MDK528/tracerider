import { eq } from "drizzle-orm"
import { db } from "../../common/config/db.js"
import { driverInfoTable } from "./drivers.model.js"
import { usersTable } from "../auth/auth.model.js"
import { ApiError } from "../../common/utils/apiError.js"
import type { UpdateDriverProfileType, ToggleAvailabilityType } from "./dto/drivers.dto.js"

const getDriverProfileService = async (driverId: string) => {
    const [driver] = await db
        .select({
            id: driverInfoTable.id,
            isAvailable: driverInfoTable.isAvailable,
            isVerified: driverInfoTable.isVerified,
            totalTrips: driverInfoTable.totalTrips,
            state: driverInfoTable.state,
            serviceArea: driverInfoTable.serviceArea,
            vehicleModel: driverInfoTable.vehicleModel,
            vehicleNo: driverInfoTable.vehicleNo,
            licenceNo: driverInfoTable.licenceNo,
            fullName: usersTable.fullName,
            phone: usersTable.phone,
            avatarUrl: usersTable.avatarUrl,
        })
        .from(driverInfoTable)
        .innerJoin(usersTable, eq(driverInfoTable.id, usersTable.id))
        .where(eq(driverInfoTable.id, driverId))

    if (!driver) throw ApiError.notfound("Driver not found")

    return driver
}

// const updateDriverProfileService = async (driverId: string, updates: UpdateDriverProfileType) => {
//     const [existing] = await db
//         .select({ id: driverInfoTable.id })
//         .from(driverInfoTable)
//         .where(eq(driverInfoTable.id, driverId))

//     if (!existing) throw ApiError.notfound("Driver not found")

//     const [updated] = await db
//         .update(driverInfoTable)
//         .set(updates)
//         .where(eq(driverInfoTable.id, driverId))
//         .returning({
//             id: driverInfoTable.id,
//             state: driverInfoTable.state,
//             serviceArea: driverInfoTable.serviceArea,
//         })

//     return updated
// }

const updateDriverProfileService = async (driverId: string, updates: UpdateDriverProfileType) => {
    const [existing] = await db
        .select({ id: driverInfoTable.id, totalTrips: driverInfoTable.totalTrips })
        .from(driverInfoTable)
        .where(eq(driverInfoTable.id, driverId))

    if (!existing) throw ApiError.notfound("Driver not found")

    if (existing.totalTrips > 0 && (updates.vehicleModel || updates.vehicleNo || updates.licenceNo)) {
        throw ApiError.forbidden("Vehicle documents cannot be changed after completing a trip")
    }

    const [updated] = await db
        .update(driverInfoTable)
        .set(updates)
        .where(eq(driverInfoTable.id, driverId))
        .returning({
            id: driverInfoTable.id,
            state: driverInfoTable.state,
            serviceArea: driverInfoTable.serviceArea,
            vehicleModel: driverInfoTable.vehicleModel,
            vehicleNo: driverInfoTable.vehicleNo,
            licenceNo: driverInfoTable.licenceNo,
        })

    return updated
}

const toggleAvailabilityService = async (driverId: string, isAvailable: boolean) => {
    const [existing] = await db
        .select({ id: driverInfoTable.id })
        .from(driverInfoTable)
        .where(eq(driverInfoTable.id, driverId))

    if (!existing) throw ApiError.notfound("Driver not found")

    const [updated] = await db
        .update(driverInfoTable)
        .set({ isAvailable })
        .where(eq(driverInfoTable.id, driverId))
        .returning({
            id: driverInfoTable.id,
            isAvailable: driverInfoTable.isAvailable,
        })

    return updated
}

const getPublicDriverProfileService = async (driverId: string) => {
    const [driver] = await db
        .select({
            id: driverInfoTable.id,
            isAvailable: driverInfoTable.isAvailable,
            totalTrips: driverInfoTable.totalTrips,
            vehicleModel: driverInfoTable.vehicleModel,
            vehicleNo: driverInfoTable.vehicleNo,
            fullName: usersTable.fullName,
            avatarUrl: usersTable.avatarUrl,
            phone: usersTable.phone
        })
        .from(driverInfoTable)
        .innerJoin(usersTable, eq(driverInfoTable.id, usersTable.id))
        .where(eq(driverInfoTable.id, driverId))

    if (!driver) throw ApiError.notfound("Driver not found")

    return driver
}

export {
    getDriverProfileService,
    updateDriverProfileService,
    toggleAvailabilityService,
    getPublicDriverProfileService,
}