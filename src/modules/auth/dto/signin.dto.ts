import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"

class Signin extends BaseDto{
    static schema = z.object({
        email: z.email().lowercase(),
        password: z.string(),
    })
}

export default Signin
export type SiginType = z.infer<typeof Signin.schema>