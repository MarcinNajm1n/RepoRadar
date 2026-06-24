import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repositoryFindMany: vi.fn(),
  repositoryCount: vi.fn()
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    repository: {
      findMany: mocks.repositoryFindMany,
      count: mocks.repositoryCount
    }
  }
}));

import { getRepositoryPage } from "../../src/lib/db/repositories";

describe("getRepositoryPage", () => {
  beforeEach(() => {
    mocks.repositoryFindMany.mockReset();
    mocks.repositoryCount.mockReset();
    mocks.repositoryFindMany.mockResolvedValue([]);
    mocks.repositoryCount.mockResolvedValue(0);
  });

  it("uses Prisma ordering and pagination for growth7d_desc", async () => {
    await getRepositoryPage({ sortKey: "growth7d_desc", page: 3, pageSize: 25 });

    expect(mocks.repositoryFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.repositoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ growth7d: "desc" }, { trendScore: "desc" }],
        skip: 50,
        take: 25
      })
    );
    expect(mocks.repositoryCount).toHaveBeenCalledTimes(1);
  });
});
