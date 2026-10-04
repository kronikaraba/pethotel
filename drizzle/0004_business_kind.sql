DROP INDEX "clinics_status_idx";--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "kind" text DEFAULT 'vet' NOT NULL;--> statement-breakpoint
CREATE INDEX "clinics_status_idx" ON "clinics" USING btree ("status","kind");--> statement-breakpoint
-- Pet sitter artık ayrı hesap türü: 0003'te demo veteriner kliniklerine eklenen "Evde bakım ziyareti" kaldırılır.
DELETE FROM "services" s USING "clinics" c WHERE s."clinic_id" = c."id" AND c."is_demo" = true AND s."category" = 'petsitter';--> statement-breakpoint
-- Kalan eski "petsitter" kategorili hizmetler "diğer"e taşınır.
UPDATE "services" SET "category" = 'diger' WHERE "category" = 'petsitter';
