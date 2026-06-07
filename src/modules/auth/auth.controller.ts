import type { Request, Response } from 'express'
import { ApiResponse } from "../../common/utils/apiResponse.js"
import { 
    signupService, 
    signinService, 
    signoutService, 
    getmeService, 
    refreshAccessTokenService, 
    forgotPasswordService, 
    resetPasswordService, 
    verifyEmailService, 
    updateUserService 
} from './auth.service.js'

const signUpController = async (req: Request, res: Response) => {
    const user = await signupService(req.body)
    ApiResponse.created(res, "User signed up successfully", user)
}

const signInController = async (req: Request, res: Response) => {
    const {user, accessToken, refreshToken} = await signinService(req.body)

    res.cookie("accessToken", accessToken,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 15 * 60 * 1000
    }).cookie("refreshToken", refreshToken,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 5 * 24 * 60 * 60 * 1000
    })

    ApiResponse.ok(res, "User signed in successfully", { id: user.id, accessToken, refreshToken })
}

const signOutController = async (req: Request, res: Response) => {
    await signoutService(req.user.id)

    res.clearCookie("accessToken", {
        sameSite: "none",
        secure: true,
    })
    res.clearCookie("refreshToken", {
        sameSite: "none",
        secure: true,
    })

    ApiResponse.ok(res, "User signed out successfully")
}

const getMeController = async (req: Request, res: Response) => {
    const user = await getmeService(req.user.id)
    ApiResponse.ok(
        res, 
        "User data fetched successfully",  
            {
                fullName:user.fullName,  
                email:user.email, 
                gender:user.gender, 
                phone:user.phone, 
                address:user.address, 
                avatar:user.avatarUrl,
                role: user.role
            }
    )
}

const refreshAccessTokenController = async (req: Request, res: Response) => {
    const {accessToken, refreshToken} = await refreshAccessTokenService(req.cookies.refreshToken)

    res.cookie("accessToken", accessToken,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 15 * 60 * 1000
    }).cookie("refreshToken", refreshToken,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 5 * 24 * 60 * 60 * 1000
    })

    ApiResponse.ok(res, "Tokens are refreshed", { accessToken, refreshToken })
}

const forgotPasswordController = async (req: Request, res: Response) => {
    await forgotPasswordService({email: req.body.email})
    ApiResponse.ok(res, "Password reset link sent to your email")
}

const resetPasswordController = async (req: Request, res: Response) => {
    const {newPassword, confirmPassword} = req.body
    const token = req.query.token as string

    const { updatedUser } = await resetPasswordService({newPassword, confirmPassword, token})
    ApiResponse.ok(res, "Password updation successfull", updatedUser?.id)
}

const verifyEmailController = async (req: Request, res: Response) => {
    const token = req.query.token as string

    const { updatedUser } = await verifyEmailService(token)
    ApiResponse.ok(res, "Email verification successfull", {id: updatedUser?.id, status: updatedUser?.isVerified})
}


const updateUserController = async (req: Request, res: Response) => {
    const updatedUser = await updateUserService(req.user.id, req.body)
    
    ApiResponse.ok(res, "User updated successfully", updatedUser)
}

export { signUpController, signInController, signOutController, getMeController, refreshAccessTokenController,forgotPasswordController, resetPasswordController, verifyEmailController, updateUserController }
