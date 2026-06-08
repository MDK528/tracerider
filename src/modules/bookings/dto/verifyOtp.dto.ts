import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"

class VerifyOtp extends BaseDto {
    static schema = z.object({
        otp: z.string().length(4)
    })
}

export default VerifyOtp
export type VerifyOtpType = z.infer<typeof VerifyOtp.schema>