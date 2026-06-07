import { Router } from 'express'
import { validate } from "../../common/middleware/validate.middleware.js";
import Signup from "./dto/signup.dto.js";
import Signin from "./dto/signin.dto.js";
import UpdateUser from "./dto/updateUser.dto.js";
import { signInController, 
    signOutController, 
    signUpController, 
    getMeController, 
    refreshAccessTokenController, 
    forgotPasswordController, 
    resetPasswordController, 
    verifyEmailController, 
    updateUserController 
} from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import Resetpassword, { ForgotPassword } from './dto/resetPassword.dto.js';


const router:Router = Router()

router.post('/sign-up', validate(Signup), signUpController)
router.post('/sign-in', validate(Signin), signInController)
router.post('/sign-out', authenticate, signOutController)
router.get("/get-me", authenticate, getMeController)
router.post("/refresh-accesstoken", refreshAccessTokenController)
router.post("/forgot-password", validate(ForgotPassword), forgotPasswordController)
router.patch("/reset-password", validate(Resetpassword), resetPasswordController)
router.patch("/verify-email", verifyEmailController)
router.patch("/update-me", authenticate, validate(UpdateUser), updateUserController)

export default router