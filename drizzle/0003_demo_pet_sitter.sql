-- Canlıdaki demo kliniklere "Pet sitter" hizmeti ekler (yeni kurulumlarda demo verisi bunu zaten içerir).
INSERT INTO "services" ("clinic_id", "name", "category", "duration_minutes", "price", "description", "sort_order")
SELECT c."id", 'Evde bakım ziyareti', 'petsitter', 60, 750,
  'Klinik ekibinden bir bakıcı evine gelir: mama, su, kum kabı, ilaç, oyun ve kısa yürüyüş.',
  (SELECT COALESCE(MAX(s."sort_order"), -1) + 1 FROM "services" s WHERE s."clinic_id" = c."id")
FROM "clinics" c
WHERE c."is_demo" = true
  AND c."slug" IN ('moda-pati-veteriner', 'levent-dostlar-hayvan-hastanesi', 'cankaya-can-dost-veteriner', 'karsiyaka-sahil-veteriner', 'nilufer-patiler-veteriner', 'bornova-minik-pati')
  AND NOT EXISTS (SELECT 1 FROM "services" s WHERE s."clinic_id" = c."id" AND s."category" = 'petsitter');
