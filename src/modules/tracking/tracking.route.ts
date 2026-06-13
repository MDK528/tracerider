import { Router } from "express"
import { getTrackingInfoController } from "./tracking.controller.js"

const router: Router = Router()

router.get("/:token", getTrackingInfoController)

export default router