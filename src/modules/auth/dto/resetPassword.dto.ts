import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"


class Resetpassword extends BaseDto {
    static schema = z.object({
        newPassword: z.string().min(8, "Password must contain 8 characters minimum"),
        confirmPassword: z.string().min(8, "Password must contain 8 characters minimum"),
        token: z.string()
    })
}

export default Resetpassword
export type ResetPassType = z.infer<typeof Resetpassword.schema>

export const emailSchema = z.object({
    email: z.email().lowercase()
})

export type EmailType = z.infer<typeof emailSchema>