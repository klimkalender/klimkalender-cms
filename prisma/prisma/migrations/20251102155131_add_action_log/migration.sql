-- CreateTable
CREATE TABLE "action_logs" (
    "id" SERIAL NOT NULL,
    "action_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "datetime" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);


-- create policy "public can access action_logs"
-- on public.action_logs
-- for all to authenticated
-- using (true);

