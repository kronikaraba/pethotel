CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"clinic_id" uuid NOT NULL,
	"service_id" uuid,
	"vet_id" uuid,
	"service_name" text NOT NULL,
	"vet_name" text,
	"price" integer,
	"date" date NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"source" text DEFAULT 'online' NOT NULL,
	"pet_name" text NOT NULL,
	"pet_species" text NOT NULL,
	"pet_breed" text,
	"pet_age" text,
	"owner_name" text NOT NULL,
	"owner_phone" text NOT NULL,
	"owner_email" text,
	"notes" text,
	"consent_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_code_unique" UNIQUE("code"),
	CONSTRAINT "appointments_time_order" CHECK ("appointments"."end_minute" > "appointments"."start_minute")
);
--> statement-breakpoint
CREATE TABLE "boarding_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"clinic_id" uuid NOT NULL,
	"species" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" integer NOT NULL,
	"nightly_price" integer,
	"total_price" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"pet_name" text NOT NULL,
	"pet_breed" text,
	"pet_age" text,
	"vaccinated" boolean DEFAULT false NOT NULL,
	"owner_name" text NOT NULL,
	"owner_phone" text NOT NULL,
	"owner_email" text,
	"notes" text,
	"clinic_note" text,
	"consent_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boarding_reservations_code_unique" UNIQUE("code"),
	CONSTRAINT "boarding_date_order" CHECK ("boarding_reservations"."check_out" > "boarding_reservations"."check_in")
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"description" text,
	"working_hours" jsonb NOT NULL,
	"closed_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slot_minutes" integer DEFAULT 15 NOT NULL,
	"min_notice_minutes" integer DEFAULT 60 NOT NULL,
	"max_days_ahead" integer DEFAULT 30 NOT NULL,
	"auto_confirm" boolean DEFAULT true NOT NULL,
	"boarding_enabled" boolean DEFAULT false NOT NULL,
	"boarding_cat_capacity" integer DEFAULT 0 NOT NULL,
	"boarding_dog_capacity" integer DEFAULT 0 NOT NULL,
	"boarding_cat_price" integer,
	"boarding_dog_price" integer,
	"boarding_notes" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'muayene' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"clinic_id" uuid,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text DEFAULT 'Veteriner Hekim' NOT NULL,
	"bio" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vet_id_vets_id_fk" FOREIGN KEY ("vet_id") REFERENCES "public"."vets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_reservations" ADD CONSTRAINT "boarding_reservations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vets" ADD CONSTRAINT "vets_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_clinic_date_idx" ON "appointments" USING btree ("clinic_id","date");--> statement-breakpoint
CREATE INDEX "appointments_vet_date_idx" ON "appointments" USING btree ("vet_id","date");--> statement-breakpoint
CREATE INDEX "boarding_clinic_dates_idx" ON "boarding_reservations" USING btree ("clinic_id","check_in","check_out");--> statement-breakpoint
CREATE INDEX "clinics_city_idx" ON "clinics" USING btree ("city","district");--> statement-breakpoint
CREATE INDEX "clinics_status_idx" ON "clinics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_clinic_idx" ON "services" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "users_clinic_idx" ON "users" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "vets_clinic_idx" ON "vets" USING btree ("clinic_id");