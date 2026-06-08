import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { bookingTable } from "../bookings/bookings.model.js"
import { paymentMethodEnum } from "../../common/enums/shared.enums.js"


export const paymentStatusEnum = pgEnum("payment_status", ["pending", "success", "failed"])

export const paymentsTable = pgTable("payments", {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull().references(() => bookingTable.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    amount: integer("amount").notNull(),
    transactionId: varchar("transaction_id"),
    status: paymentStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})