import { AuthUser } from "../../modules/auth/auth.middleware.ts";

declare global{
    namespace Express{
        interface Request {
            user: AuthUser;
        }
    }
}