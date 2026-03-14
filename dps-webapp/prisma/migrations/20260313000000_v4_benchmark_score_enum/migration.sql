-- DPS v4: Migrate BenchmarkScore enum
-- Remove EXCELLENT (→ GREAT) and POOR (→ SUBSTANDARD), add SIZE

-- Step 1: Update existing data to use the new verdict names
UPDATE "KpiValue" SET "benchmarkScore" = 'GREAT' WHERE "benchmarkScore" = 'EXCELLENT';
UPDATE "KpiValue" SET "benchmarkScore" = 'SUBSTANDARD' WHERE "benchmarkScore" = 'POOR';

-- Step 2: Rename the old enum so we can create a new one
ALTER TYPE "BenchmarkScore" RENAME TO "BenchmarkScore_old";

-- Step 3: Create the new enum without EXCELLENT/POOR, with SIZE
CREATE TYPE "BenchmarkScore" AS ENUM ('EXCEPTIONAL', 'GREAT', 'GOOD', 'ACCEPTABLE', 'WEAK', 'SUBSTANDARD', 'SIZE', 'NA');

-- Step 4: Alter the column to use the new enum
ALTER TABLE "KpiValue" ALTER COLUMN "benchmarkScore" TYPE "BenchmarkScore" USING ("benchmarkScore"::text::"BenchmarkScore");

-- Step 5: Drop the old enum
DROP TYPE "BenchmarkScore_old";
