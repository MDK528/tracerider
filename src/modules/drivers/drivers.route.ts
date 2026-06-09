import { Router } from "express"
import { authenticate, authorize } from "../auth/auth.middleware.js"
import { validate, validateParams } from "../../common/middleware/validate.middleware.js"
import { UpdateDriverProfile, ToggleAvailability } from "./dto/drivers.dto.js"
import UUIDParams from "../../common/dto/uuidParams.dto.js"
import {
    getDriverProfileController,
    updateDriverProfileController,
    toggleAvailabilityController,
    getPublicDriverProfileController,
} from "./drivers.controller.js"

const router: Router = Router()

router.get("/profile", authenticate, authorize("driver"), getDriverProfileController)
router.patch("/profile", authenticate, authorize("driver"), validate(UpdateDriverProfile), updateDriverProfileController)
router.patch("/availability", authenticate, authorize("driver"), validate(ToggleAvailability), toggleAvailabilityController)
router.get("/:id", authenticate, validateParams(UUIDParams), getPublicDriverProfileController)

export default router