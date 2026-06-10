import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { db } from "./common/config/db.js";
import { sql } from "drizzle-orm/sql/sql";
import { initIO } from "./modules/realtime/realtime.js";

const PORT = process.env.PORT || 5000;

;(async function start() {
    try {
        await db.execute(sql`select 1`)

        const httpServer = createServer(app);
        initIO(httpServer);

        httpServer.listen(PORT, () => {
            console.log(`Server is up and running at http://localhost:${PORT}`)
        })

    } catch (error) {
        console.error('Failed to start server', error)
        process.exit(1)
    }
})()