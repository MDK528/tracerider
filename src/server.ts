import "dotenv/config";
import app from "./app.js";
import { db } from "./common/config/db.js";
import { sql } from "drizzle-orm/sql/sql";


const PORT = process.env.PORT || 5000;

;(async function start () {
    try {
        await db.execute(sql`select 1`)
        
        app.listen(PORT, ()=>{
            console.log(`Server is up and running at http://localhost:${PORT}`)
        })

    } catch (error) {
        console.error('Failed to start server', error)
        process.exit(1)
    }
})()