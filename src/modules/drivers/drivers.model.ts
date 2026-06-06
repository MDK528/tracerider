import { pgTable, uuid, varchar, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core"
import { usersTable } from "../auth/auth.model.js"


export const driverInfoTable = pgTable("driver_info", {
    id: uuid("id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").default(false).notNull(),
    isVerified: boolean("is_verified").default(true).notNull(),
    totalTrips: integer("total_trips").default(0).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    serviceArea: varchar("service_area", { length: 100 }).array().notNull(),
    vehicleModel: varchar("vehicle_model", { length: 100 }).notNull(),
    vehicleNo: varchar("vehicle_no", { length: 20 }).notNull().unique(),
    licenceNo: varchar("licence_no", { length: 30 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})
