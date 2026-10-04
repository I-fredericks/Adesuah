-- AddForeignKey
ALTER TABLE "feestructure" ADD CONSTRAINT "feestructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "schoolclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
