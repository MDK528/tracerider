import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"

class CancelBooking extends BaseDto {
    static schema = z.object({
        reason: z.string().max(200).optional()
    })
}

export default CancelBooking