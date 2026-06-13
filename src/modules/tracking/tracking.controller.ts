import type { Request, Response } from "express"
import { ApiResponse } from "../../common/utils/apiResponse.js"
import { getTrackingInfoService } from "./tracking.service.js"
 
const getTrackingInfoController = async (req: Request, res: Response) => {
    const token = String(req.params.token)
    const info = await getTrackingInfoService(token)
    ApiResponse.ok(res, "Tracking info fetched", info)
}
 
export { getTrackingInfoController }