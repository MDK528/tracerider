import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"

class CreateBooking extends BaseDto {
    static schema = z.object({
        pickupCity: z.string().trim().min(2).max(100),
        pickupLocation: z.string().trim().min(5),
        dropLocation: z.string().trim().min(5),
        pickupLat: z.number(),
        pickupLng: z.number(),
        dropLat: z.number(),
        dropLng: z.number(),
        paymentMethod: z.enum(["cash", "razorpay"])
    })
}

export default CreateBooking
export type CreateBookingType = z.infer<typeof CreateBooking.schema>