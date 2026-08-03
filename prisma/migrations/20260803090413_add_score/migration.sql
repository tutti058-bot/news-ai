-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_News" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "image" TEXT,
    "category" TEXT,
    "score" INTEGER NOT NULL DEFAULT 50,
    "source" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_News" ("category", "content", "createdAt", "id", "image", "publishedAt", "source", "sourceUrl", "summary", "title") SELECT "category", "content", "createdAt", "id", "image", "publishedAt", "source", "sourceUrl", "summary", "title" FROM "News";
DROP TABLE "News";
ALTER TABLE "new_News" RENAME TO "News";
CREATE UNIQUE INDEX "News_sourceUrl_key" ON "News"("sourceUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
