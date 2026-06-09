import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"

export class UpdateDriverProfile extends BaseDto {
    static schema = z.object({
        state: z.string().trim().min(2, "Minimum 2 characters").max(100).optional(),
        serviceArea: z.array(z.string().trim().min(2, "Minimum 2 characters").max(100)).min(1).optional(),
        vehicleModel: z.string().trim().min(2, "Minimum 2 characters").max(100).optional(),
        vehicleNo: z.string().trim().min(2, "Minimum 2 characters").max(20).optional(),
        licenceNo: z.string().trim().min(2, "Minimum 2 characters").max(30).optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided"
    })
}

export type UpdateDriverProfileType = z.infer<typeof UpdateDriverProfile.schema>

export class ToggleAvailability extends BaseDto {
    static schema = z.object({
        isAvailable: z.boolean()
    })
}

export type ToggleAvailabilityType = z.infer<typeof ToggleAvailability.schema>