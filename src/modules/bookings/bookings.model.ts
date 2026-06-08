import { pgTable, uuid, varchar, timestamp, pgEnum, integer, text, real } from "drizzle-orm/pg-core"
import { usersTable } from "../auth/auth.model.js"
import { driverInfoTable } from "../drivers/drivers.model.js"
import { paymentMethodEnum } from "../../common/enums/shared.enums.js"


export const rideStatusEnum = pgEnum("ride_status", [
    "requested",
    "driver_assigned",
    "driver_arriving",
    "otp_verified",
    "in_progress",
    "completed",
    "cancelled"
])

export const cancelledByEnum = pgEnum("cancelled_by", ["passenger", "driver"])

export const bookingTable = pgTable("booking", {
    id: uuid("id").primaryKey().defaultRandom(),
    passengerId: uuid("passenger_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    driverId: uuid("driver_id").references(() => driverInfoTable.id, { onDelete: "set null" }),
    pickupCity: varchar("pickup_city", { length: 100 }).notNull(),
    pickupLocation: text("pickup_location").notNull(),
    dropLocation: text("drop_location").notNull(),
    pickupLat: real("pickup_lat").notNull(),
    pickupLng: real("pickup_lng").notNull(),
    dropLat: real("drop_lat").notNull(),
    dropLng: real("drop_lng").notNull(),
    fareAmount: integer("fare_amount").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    status: rideStatusEnum("status").default("requested").notNull(),
    otp: varchar("otp", { length: 4 }),
    cancelledBy: cancelledByEnum("cancelled_by"),
    cancellationReason: varchar("cancellation_reason", { length: 200 }),
    confirmedAt: timestamp("confirmed_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})