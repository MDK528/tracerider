import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"


class Signup extends BaseDto{
    static schema = z.object({
        fullName: z.string().trim().min(2, "Full Name must be atleast 7 character").max(90, "Full Name must be less than 90 character"),
        email: z.email().lowercase(),
        phone: z.string().max(17),
        gender: z.enum(["male", "female"]),
        role: z.enum(["passenger", "driver", "admin"]).default("passenger"),
        address: z.string().max(340),
        avatarUrl:  z.string(),
        password: z.string().min(6, "Password must contain 8 characters minimum"),
    })
}

export default Signup
export type SignupType = z.infer<typeof Signup.schema>