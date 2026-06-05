import { z } from "zod";

class BaseDto {
    static schema = z.object({})
    
    static validate (data: Record<string, unknown>){
        const result = this.schema.safeParse(data)

        if (result.error) return {error: result.error.issues, data: null}

        return {error: null, data: result.data}
    }
}

export default BaseDto
export type BaseDtoType = typeof BaseDto