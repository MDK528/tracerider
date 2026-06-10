import { Redis } from "ioredis";

let redis: Redis;

const getRedis = (): Redis => {
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL!);

        redis.on("connect", () => console.log("Redis connected"));
        redis.on("error", (err) => console.error("Redis error:", err));
    }
    return redis;
};

// Driver location
const LOCATION_TTL = 30; // seconds — auto-expire if driver goes offline

const setDriverLocation = async (driverId: string, lat: number, lng: number): Promise<void> => {
    const key = `driver:location:${driverId}`;
    await getRedis().setex(key, LOCATION_TTL, JSON.stringify({ lat, lng }));
};

const getDriverLocation = async (driverId: string): Promise<{ lat: number; lng: number } | null> => {
    const key = `driver:location:${driverId}`;
    const data = await getRedis().get(key);
    return data ? (JSON.parse(data) as { lat: number; lng: number }) : null;
};

const deleteDriverLocation = async (driverId: string): Promise<void> => {
    await getRedis().del(`driver:location:${driverId}`);
};

// Socket ID ↔ userId mapping (for server-to-client pushes)
const setUserSocket = async (userId: string, socketId: string): Promise<void> => {
    await getRedis().setex(`user:socket:${userId}`, 3600, socketId);
};

const getUserSocket = async (userId: string): Promise<string | null> => {
    return getRedis().get(`user:socket:${userId}`);
};

const deleteUserSocket = async (userId: string): Promise<void> => {
    await getRedis().del(`user:socket:${userId}`);
};

export {
    getRedis,
    setDriverLocation,
    getDriverLocation,
    deleteDriverLocation,
    setUserSocket,
    getUserSocket,
    deleteUserSocket,
};