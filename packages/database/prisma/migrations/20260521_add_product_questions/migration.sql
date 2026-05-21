CREATE TABLE "product_questions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_questions_productId_idx" ON "product_questions"("productId");
CREATE INDEX "product_questions_userId_idx" ON "product_questions"("userId");
CREATE INDEX "product_questions_answeredBy_idx" ON "product_questions"("answeredBy");

ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_answeredBy_fkey"
    FOREIGN KEY ("answeredBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
