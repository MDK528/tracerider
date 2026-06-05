CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('passenger', 'driver', 'admin');--> statement-breakpoint
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
