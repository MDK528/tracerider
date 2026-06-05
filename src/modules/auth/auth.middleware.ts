import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../common/config/db.js";
import { ApiError } from "../../common/utils/apiError.js";
import { verifyAccessToken } from "../../common/utils/jwt.js";
import { usersTable } from "./auth.model.js";

export type AuthUser = {
    id: string;
    role: "passenger" | "driver" | "admin";
    email: string;
}

type Role = AuthUser["role"]

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    let token;
 
    if (req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1]
    }

    if (!token) throw ApiError.unauthorized("Not Authenticated");

    const decodedToken = verifyAccessToken(token)
    
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decodedToken.id))

    if(!user) throw ApiError.badRequest("User not found");

    req.user = {
        id: user.id,
        role: user.role,
        email: user.email
    }

    next()
}

const authorize = (...roles: Array<Role>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        "You do not have permission to perform this action",
      );
    }
    next();
  };
};


export {authenticate, authorize}