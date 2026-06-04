import crypto from "node:crypto"
import jwt from "jsonwebtoken"

interface UserToken{
    id: string
}

const generateAccessToken = (payload: UserToken): string => {
    return jwt.sign(
        payload, 
        process.env.ACCESS_TOKEN_SECRET!, 
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY as any
        }
    )
}

const verifyAccessToken = (token: string): UserToken => {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as UserToken
}

const generateRefreshToken = (payload: UserToken): string => {
    return jwt.sign(
        payload, 
        process.env.REFRESH_TOKEN_SECRET!, 
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY as any
        }
    )
}
const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as UserToken
}

const generateResetPasswordToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, generateResetPasswordToken }