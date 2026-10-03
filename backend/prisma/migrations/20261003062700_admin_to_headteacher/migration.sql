-- Legacy 'ADMIN' role maps to the real-world position: HEADTEACHER
UPDATE "user" SET "role" = 'HEADTEACHER' WHERE "role" = 'ADMIN'::"Role";
