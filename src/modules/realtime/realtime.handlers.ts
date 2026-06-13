import type { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "../../common/config/db.js";
import { EVENTS } from "./realtime.events.js";
import {
    setDriverLocation,
    deleteDriverLocation,
    getDriverLocation,
    setUserSocket,
    deleteUserSocket,
    getUserSocket,
} from "./realtime.redis.js";
import {getTrackNamespace} from "./realtime.js"
import { driverInfoTable } from "../drivers/drivers.model.js";
import { bookingTable } from "../bookings/bookings.model.js";

const registerHandlers = (io: Server, socket: Socket): void => {
    const userId = socket.data.userId as string;

    // Store socket mapping on connect
    setUserSocket(userId, socket.id);

    // ─── Driver: Go Online ────────────────────────────────────────────
    socket.on(EVENTS.DRIVER_GO_ONLINE, async () => {
        try {
            await db
                .update(driverInfoTable)
                .set({ isAvailable: true })
                .where(eq(driverInfoTable.id, userId));

            socket.join(`driver:${userId}`);
            console.log(`Driver online: ${userId}`);
        } catch (err) {
            console.error("DRIVER_GO_ONLINE error:", err);
        }
    });

    // ─── Driver: Go Offline ───────────────────────────────────────────
    socket.on(EVENTS.DRIVER_GO_OFFLINE, async () => {
        try {
            await db
                .update(driverInfoTable)
                .set({ isAvailable: false })
                .where(eq(driverInfoTable.id, userId));

            await deleteDriverLocation(userId);
            socket.leave(`driver:${userId}`);
            console.log(`Driver offline: ${userId}`);
        } catch (err) {
            console.error("DRIVER_GO_OFFLINE error:", err);
        }
    });

    // ─── Driver: Location Update ──────────────────────────────────────
    socket.on(EVENTS.DRIVER_LOCATION_UPDATE, async (payload: { lat: number; lng: number; rideId?: string }) => {
        try {
            const { lat, lng, rideId } = payload;
     
            await setDriverLocation(userId, lat, lng);
     
            // If driver is on an active ride, forward location to passenger
            if (rideId) {
                const passengerSocketId = await getPassengerSocketForRide(rideId, userId);
                if (passengerSocketId) {
                    io.to(passengerSocketId).emit(EVENTS.DRIVER_LOCATION, { lat, lng });
                }
     
                // Also broadcast to anyone watching via a public share link
                getTrackNamespace().to(`track:${rideId}`).emit(EVENTS.DRIVER_LOCATION, { lat, lng });
            }
        } catch (err) {
            console.error("DRIVER_LOCATION_UPDATE error:", err);
        }
    });
    
    // ─── Driver: Accept Ride ──────────────────────────────────────────
    socket.on(EVENTS.DRIVER_ACCEPT_RIDE, async (payload: { rideId: string }) => {
        try {
            const { rideId } = payload;

            const [booking] = await db
                .select()
                .from(bookingTable)
                .where(eq(bookingTable.id, rideId));

            if (!booking || booking.status !== "requested") return;

            await db
                .update(bookingTable)
                .set({ driverId: userId, status: "driver_assigned", confirmedAt: new Date() })
                .where(eq(bookingTable.id, rideId));

            // Notify passenger
            const passengerSocketId = await getUserSocket(booking.passengerId);
            if (passengerSocketId) {
                io.to(passengerSocketId).emit(EVENTS.DRIVER_ASSIGNED, {
                    rideId,
                    driverId: userId,
                });
            }

            // Join ride room for chat
            socket.join(`ride:${rideId}`);

            console.log(`Driver ${userId} accepted ride ${rideId}`);
        } catch (err) {
            console.error("DRIVER_ACCEPT_RIDE error:", err);
        }
    });

    // ─── Driver: Reject Ride ──────────────────────────────────────────
    socket.on(EVENTS.DRIVER_REJECT_RIDE, async (payload: { rideId: string }) => {
        try {
            // Just log for now — re-broadcast logic (find next driver) goes here later
            console.log(`Driver ${userId} rejected ride ${payload.rideId}`);
        } catch (err) {
            console.error("DRIVER_REJECT_RIDE error:", err);
        }
    });

    // ─── Driver: Arrived at Pickup ────────────────────────────────────
    socket.on(EVENTS.DRIVER_ARRIVED, async (payload: { rideId: string }) => {
        try {
            const { rideId } = payload;

            await db
                .update(bookingTable)
                .set({ status: "driver_arriving" })
                .where(eq(bookingTable.id, rideId));

            const passengerSocketId = await getPassengerSocketForRide(rideId, userId);
            if (passengerSocketId) {
                io.to(passengerSocketId).emit(EVENTS.DRIVER_ARRIVING, { rideId });
            }
        } catch (err) {
            console.error("DRIVER_ARRIVED error:", err);
        }
    });

    // ─── Passenger: Cancel Ride ───────────────────────────────────────
    socket.on(EVENTS.PASSENGER_CANCEL_RIDE, async (payload: { rideId: string }) => {
        try {
            const { rideId } = payload;

            const [booking] = await db
                .select()
                .from(bookingTable)
                .where(eq(bookingTable.id, rideId));

            if (!booking || !["requested", "driver_assigned", "driver_arriving"].includes(booking.status)) return;

            await db
                .update(bookingTable)
                .set({ status: "cancelled", cancelledBy: "passenger", cancelledAt: new Date() })
                .where(eq(bookingTable.id, rideId));

            // Notify driver if one was assigned
            if (booking.driverId) {
                const driverSocketId = await getUserSocket(booking.driverId);
                if (driverSocketId) {
                    io.to(driverSocketId).emit(EVENTS.RIDE_CANCELLED, { rideId });
                }
            }
        } catch (err) {
            console.error("PASSENGER_CANCEL_RIDE error:", err);
        }
    });

    // ─── Chat ─────────────────────────────────────────────────────────
    socket.on(EVENTS.CHAT_MESSAGE, (payload: { rideId: string; message: string }) => {
        const { rideId, message } = payload;

        // Broadcast to the other party in the ride room (excluding sender)
        socket.to(`ride:${rideId}`).emit(EVENTS.CHAT_MESSAGE, {
            from: userId,
            message,
            timestamp: Date.now(),
        });
    });

    // ─── Disconnect ───────────────────────────────────────────────────
    socket.on("disconnect", async () => {
        try {
            await deleteUserSocket(userId);
            await deleteDriverLocation(userId); // no-op if passenger
        } catch (err) {
            console.error("disconnect cleanup error:", err);
        }
    });
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const getPassengerSocketForRide = async (rideId: string, driverId: string): Promise<string | null> => {
    const [booking] = await db
        .select({ passengerId: bookingTable.passengerId })
        .from(bookingTable)
        .where(eq(bookingTable.id, rideId));

    if (!booking) return null;
    return getUserSocket(booking.passengerId);
};

export { registerHandlers };