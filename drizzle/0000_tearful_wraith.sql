CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('passenger', 'driver', 'admin');--> statement-breakpoint
CREATE TYPE "public"."cancelled_by" AS ENUM('passenger', 'driver');--> statement-breakpoint
CREATE TYPE "public"."ride_status" AS ENUM('requested', 'driver_assigned', 'driver_arriving', 'otp_verified', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(90) NOT NULL,
	"email" varchar(322) NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(17) NOT NULL,
	"gender" "gender",
	"role" "role" DEFAULT 'passenger' NOT NULL,
	"address" varchar(340),
	"avatar_url" varchar,
	"password" varchar(66),
	"refresh_token" varchar,
	"reset_password_token" varchar,
	"reset_password_expires" timestamp,
	"email_verification_token" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passenger_id" uuid NOT NULL,
	"driver_id" uuid,
	"pickup_city" varchar(100) NOT NULL,
	"pickup_location" text NOT NULL,
	"drop_location" text NOT NULL,
	"pickup_lat" real NOT NULL,
	"pickup_lng" real NOT NULL,
	"drop_lat" real NOT NULL,
	"drop_lng" real NOT NULL,
	"fare_amount" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"status" "ride_status" DEFAULT 'requested' NOT NULL,
	"otp" varchar(4),
	"cancelled_by" "cancelled_by",
	"cancellation_reason" varchar(200),
	"confirmed_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "driver_info" (
	"id" uuid PRIMARY KEY NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"total_trips" integer DEFAULT 0 NOT NULL,
	"state" varchar(100) NOT NULL,
	"service_area" varchar(100)[] NOT NULL,
	"vehicle_model" varchar(100) NOT NULL,
	"vehicle_no" varchar(20) NOT NULL,
	"licence_no" varchar(30) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "driver_info_vehicle_no_unique" UNIQUE("vehicle_no"),
	CONSTRAINT "driver_info_licence_no_unique" UNIQUE("licence_no")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" integer NOT NULL,
	"transaction_id" varchar,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_passenger_id_users_id_fk" FOREIGN KEY ("passenger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_driver_id_driver_info_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_info"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_info" ADD CONSTRAINT "driver_info_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;