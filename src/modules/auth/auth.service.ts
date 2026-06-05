import crypto from "node:crypto"
import bcrypt from "bcrypt";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../common/config/db.js";
import { usersTable } from "./auth.model.js";
import { ApiError } from "../../common/utils/apiError.js";
import { generateAccessToken, generateRefreshToken, generateResetPasswordToken, verifyRefreshToken } from "../../common/utils/jwt.js";
import { sendVerificationEmail, sendResetPasswordEmail } from "../../common/config/mailConfig.js";
import type { SignupType } from "./dto/signup.dto.js";
import type { SiginType } from "./dto/signin.dto.js";
import type { ResetPassType, EmailType} from "./dto/resetPassword.dto.js";
import type { UpdateUserType } from "./dto/updateUser.dto.js";


const signupService = async ({fullName, email, phone, gender, role, address, avatarUrl, password}: SignupType)=>{
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email))

    if(existingUser?.email) throw ApiError.badRequest("User with this email already exist");

    const hashPassword = await bcrypt.hash(password, 10)

    const {rawToken, hashedToken} = generateResetPasswordToken()

    const [result] = await db.insert(usersTable).values({
        fullName,
        email,
        phone,
        gender,
        role,
        avatarUrl,
        address,
        password: hashPassword,
        emailVerificationToken: hashedToken
    }).returning({id: usersTable.id})

    // if(role === 'driver'){
    //    await db.insert(providersTable).values({providerId: result!.id})
    // }

    try {
        const mailResult = await sendVerificationEmail(email, rawToken)
        if(!mailResult) throw ApiError.badRequest("Failed to send verification email")
    } catch (error: unknown) {
        console.error("Failed to sent verification email", (error as Error)?.message)
    }

    return result
}

const signinService = async ({email, password}: SiginType) => {

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email))

    if (!user?.email) throw ApiError.unauthorized("Inavlid email or password");

    const matchPass = await bcrypt.compare(password, user.password!)

    if(!matchPass) throw ApiError.unauthorized("Invalid email or password");

    const accessToken = generateAccessToken({id: user.id})
    const refreshToken = generateRefreshToken({id: user.id})

    await db.update(usersTable).set({refreshToken}).where(eq(usersTable.id, user.id))

    
    return {user, accessToken, refreshToken}
}

const signoutService = async (userId: string) => {
    await db.update(usersTable).set({refreshToken: null}).where(eq(usersTable.id, userId))
}

const getmeService = async (userId: string) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId))

    if(!user?.id) throw ApiError.notfound("User not found");

    return user
}

const refreshAccessTokenService = async(token: string) => {

    if(!token) throw ApiError.unauthorized("Refresh token missing");

    const decodedToken = verifyRefreshToken(token)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decodedToken.id))

    if(!user?.id) throw ApiError.notfound("User not found");

    const accessToken = generateAccessToken({id: user.id})
    const refreshToken = generateRefreshToken({id: user.id})

    await db.update(usersTable).set({refreshToken: refreshToken}).where(eq(usersTable.id, user.id))

    return {accessToken, refreshToken}
}

const forgotPasswordService = async ({email}: EmailType) => {

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email))

    if(!user?.email) throw ApiError.notfound("This email does not exist");

    const {rawToken, hashedToken} = generateResetPasswordToken()

    await db
        .update(usersTable)
        .set({resetPasswordToken: hashedToken, resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000)})
        .where(eq(usersTable.email, user.email));

    
    try {
        const mailResult = await sendResetPasswordEmail(email, rawToken, user.fullName)
        if(!mailResult) throw ApiError.badRequest("Failed to send reset email")
    } catch (error: unknown) {
        console.error("Failed to send reset email:", (error as Error)?.message);
    }    
}

const resetPasswordService = async({newPassword, confirmPassword, token}: ResetPassType) => {
    if(!token.trim()) throw ApiError.notfound("Token are not found")
    
    const hashedlToken = crypto.createHash("sha256").update(token).digest("hex")
    
    const [user] = await db
    .select()
    .from(usersTable)
    .where(and(
        eq(usersTable.resetPasswordToken, hashedlToken),
        gt(usersTable.resetPasswordExpires, new Date())
    ))
    
    if(!user?.resetPasswordToken) throw ApiError.badRequest("Invalid or expired token");

    if (newPassword !== confirmPassword) throw ApiError.unprocessable("New password and confirm passowrd mismatch");

    const hashPassword = await bcrypt.hash(newPassword, 10)

    const [updatedUser] = await db
        .update(usersTable)
        .set({password: hashPassword, resetPasswordToken: null, resetPasswordExpires: null})
        .where(eq(usersTable.id, user.id))
        .returning({id: usersTable.id})

    return {updatedUser}
}

const verifyEmailService = async (token: string) =>{
    if(!token.trim()) throw ApiError.badRequest("Invalid or exprired verifcation token");

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const [user] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, hashedToken))

    if(!user?.emailVerificationToken) throw ApiError.badRequest("Invalid or Expired token");

    const [updatedUser] = await db
        .update(usersTable)
        .set({isEmailVerified: true, emailVerificationToken: null})
        .where(eq(usersTable.id, user.id))
        .returning({id: usersTable.id, isVerified: usersTable.isEmailVerified})

    return { updatedUser }
}

const updateUserService = async (userId: string, updates: UpdateUserType) => {
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId))

    if (!existingUser?.id) throw ApiError.notfound("User not found")

    if (updates.phone) {
        const [phoneConflict] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.phone, updates.phone))

        if (phoneConflict && phoneConflict.id !== userId) {
            throw ApiError.conflict("Phone number already in use")
        }
    }

    const [updatedUser] = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, userId))
        .returning({
            id:        usersTable.id,
            fullName: usersTable.fullName,
            phone:     usersTable.phone,
            gender:    usersTable.gender,
            address:   usersTable.address,
            avatarUrl: usersTable.avatarUrl,
        })

    return updatedUser
}

export {signupService, signinService, signoutService, getmeService, refreshAccessTokenService, forgotPasswordService, resetPasswordService, verifyEmailService, updateUserService}
