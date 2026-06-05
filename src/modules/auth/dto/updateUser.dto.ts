import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js"

class UpdateUser extends BaseDto {
    static schema = z.object({
        fullName: z.string().trim().min(2).max(90, "Full Name must be less than 90 character").optional(),
        phone:     z.string().max(17).optional(),
        gender:    z.enum(["male", "female"]).optional(),
        address:   z.string().max(340).optional(),
        avatarUrl: z.string().optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided"
    })
}

export default UpdateUser
export type UpdateUserType = z.infer<typeof UpdateUser.schema>