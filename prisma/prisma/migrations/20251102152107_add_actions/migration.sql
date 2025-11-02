-- CreateEnum
CREATE TYPE "action_type" AS ENUM ('PUBLISH', 'BOULDERBOT');

-- CreateTable
CREATE TABLE "actions" (
    "id" SERIAL NOT NULL,
    "type" "action_type" NOT NULL,
    "user_email" TEXT NOT NULL,
    "start" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end" TIMESTAMPTZ(3) NOT NULL,
    "result_ok" BOOLEAN NOT NULL,
    "details" TEXT,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);


-- create policy "public can access actions"
-- on public.actions
-- for all to authenticated
-- using (true);

