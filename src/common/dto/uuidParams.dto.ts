import { z } from 'zod'
import BaseDto from './base.dto.js'

class UUIDParams extends BaseDto {
    static schema = z.object({
        id: z.uuid("Invalid ID format")
    })
}


export type UUIDParamsType = z.infer<typeof UUIDParams.schema>

class BookingIdParams extends BaseDto {
    static schema = z.object({
        bookingId: z.uuid("Invalid booking ID format")
    })
}

export type BoookingIdParamsType = z.infer<typeof BookingIdParams.schema>

export {UUIDParams, BookingIdParams}