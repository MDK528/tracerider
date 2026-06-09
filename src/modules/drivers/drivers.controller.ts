import type { Request, Response } from "express"
import { ApiResponse } from "../../common/utils/apiResponse.js"
import {
    getDriverProfileService,
    updateDriverProfileService,
    toggleAvailabilityService,
    getPublicDriverProfileService,
} from "./drivers.service.js"

const getDriverProfileController = async (req: Request, res: Response) => {
    const driver = await getDriverProfileService(req.user.id)
    ApiResponse.ok(res, "Driver profile fetched successfully", driver)
}

const updateDriverProfileController = async (req: Request, res: Response) => {
    const updated = await updateDriverProfileService(req.user.id, req.body)
    ApiResponse.ok(res, "Driver profile updated successfully", updated)
}

const toggleAvailabilityController = async (req: Request, res: Response) => {
    const updated = await toggleAvailabilityService(req.user.id, req.body.isAvailable)
    ApiResponse.ok(res, `You are now ${updated!.isAvailable ? "online" : "offline"}`, updated)
}

const getPublicDriverProfileController = async (req: Request, res: Response) => {
    const driverId = String(req.params.id)
    const driver = await getPublicDriverProfileService(driverId)
    ApiResponse.ok(res, "Driver profile fetched successfully", driver)
}

export {
    getDriverProfileController,
    updateDriverProfileController,
    toggleAvailabilityController,
    getPublicDriverProfileController,
}