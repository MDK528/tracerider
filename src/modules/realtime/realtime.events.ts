export const EVENTS = {

    // Driver → Server
    DRIVER_LOCATION_UPDATE: "driver:location:update",
    DRIVER_GO_ONLINE:       "driver:go_online",
    DRIVER_GO_OFFLINE:      "driver:go_offline",
    DRIVER_ACCEPT_RIDE:     "driver:accept_ride",
    DRIVER_REJECT_RIDE:     "driver:reject_ride",
    DRIVER_ARRIVED:         "driver:arrived",

    // Passenger → Server
    PASSENGER_CANCEL_RIDE:  "passenger:cancel_ride",

    // Server → Driver
    NEW_RIDE_REQUEST:       "server:new_ride_request",
    RIDE_CANCELLED:         "server:ride_cancelled",

    // Server → Passenger
    DRIVER_ASSIGNED:        "server:driver_assigned",
    DRIVER_LOCATION:        "server:driver_location",
    DRIVER_ARRIVING:        "server:driver_arriving",
    RIDE_STARTED:           "server:ride_started",
    RIDE_COMPLETED:         "server:ride_completed",
    DRIVER_CANCELLED:       "server:driver_cancelled",

    // Chat (bidirectional)
    CHAT_SEND:    "chat:send",
    CHAT_RECEIVE: "chat:receive",

} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];