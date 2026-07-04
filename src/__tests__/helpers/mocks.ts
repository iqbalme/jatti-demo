import { vi } from 'vitest';
import type { Mock } from 'vitest';

type PrismaDelegate = {
  findUnique: Mock;
  findMany: Mock;
  findFirst: Mock;
  create: Mock;
  update: Mock;
  updateMany: Mock;
  delete: Mock;
  deleteMany: Mock;
  count: Mock;
  groupBy: Mock;
  upsert: Mock;
  aggregate: Mock;
};

function d(): PrismaDelegate {
  return {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
    aggregate: vi.fn(),
  };
}

export interface PrismaMock {
  alumni: PrismaDelegate;
  admin: PrismaDelegate;
  education: PrismaDelegate;
  certificate: PrismaDelegate;
  organization: PrismaDelegate;
  business: PrismaDelegate;
  socialLink: PrismaDelegate;
  wilayah: PrismaDelegate;
  $disconnect: Mock;
  $connect: Mock;
  $on: Mock;
}

export function createPrismaMock(): PrismaMock {
  return {
    alumni: d(),
    admin: d(),
    education: d(),
    certificate: d(),
    organization: d(),
    business: d(),
    socialLink: d(),
    wilayah: d(),
    $disconnect: vi.fn(),
    $connect: vi.fn(),
    $on: vi.fn(),
  };
}
