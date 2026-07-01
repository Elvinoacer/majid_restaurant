/**
 * Tenant-scoped database accessor (PRD §7.3).
 *
 * Every query is structurally scoped by `restaurantId` — caller never has to
 * remember to add a `where: { restaurantId }` clause. This makes tenant leakage
 * a compile-time-adjacent problem rather than a code-review-vigilance problem.
 *
 * Usage:
 *   const db = tenantDb(restaurantId);
 *   const items = await db.menuItem.findMany({ where: { isAvailable: true } });
 *   // -> { where: { isAvailable: true, restaurantId } } automatically
 */
import { db as prisma } from "@/lib/db";

type ModelFindManyArgs<T> = T extends {
  findMany: (args: infer A) => unknown;
}
  ? A
  : never;

type ModelFindUniqueArgs<T> = T extends {
  findUnique: (args: infer A) => unknown;
}
  ? A
  : never;

type ModelFindFirstArgs<T> = T extends {
  findFirst: (args: infer A) => unknown;
}
  ? A
  : never;

/**
 * Build a tenant-scoped wrapper for one Prisma model delegate.
 * The `restaurantId` filter is merged into every find/create query —
 * it cannot be forgotten or bypassed from the call site.
 */
function makeTenantModel<
  M extends {
    findMany: (a: any) => any;
    findUnique: (a: any) => any;
    findFirst: (a: any) => any;
    create: (a: any) => any;
    createMany: (a: any) => any;
    update: (a: any) => any;
    updateMany: (a: any) => any;
    delete: (a: any) => any;
    deleteMany: (a: any) => any;
    count: (a: any) => any;
  },
>(delegate: M, restaurantId: string) {
  return {
    findMany: (args?: ModelFindManyArgs<M>) =>
      delegate.findMany({
        ...args,
        where: { ...(args as any)?.where, restaurantId },
      }),
    findUnique: (args?: ModelFindUniqueArgs<M>) =>
      delegate.findUnique({
        ...args,
        where: { ...(args as any)?.where, restaurantId },
      }),
    findFirst: (args?: ModelFindFirstArgs<M>) =>
      delegate.findFirst({
        ...args,
        where: { ...(args as any)?.where, restaurantId },
      }),
    create: (args: any) =>
      delegate.create({
        ...args,
        data: { ...args?.data, restaurantId },
      }),
    createMany: (args: any) =>
      delegate.createMany({
        ...args,
        data: (args?.data ?? []).map((row: any) => ({ ...row, restaurantId })),
      }),
    update: (args: any) =>
      delegate.update({
        ...args,
        where: { ...args?.where, restaurantId },
        data: args?.data,
      }),
    updateMany: (args: any) =>
      delegate.updateMany({
        ...args,
        where: { ...(args?.where ?? {}), restaurantId },
        data: args?.data,
      }),
    delete: (args: any) =>
      delegate.delete({
        ...args,
        where: { ...args?.where, restaurantId },
      }),
    deleteMany: (args: any) =>
      delegate.deleteMany({
        ...args,
        where: { ...(args?.where ?? {}), restaurantId },
      }),
    count: (args?: any) =>
      delegate.count({
        ...args,
        where: { ...(args?.where ?? {}), restaurantId },
      }),
  };
}

export function tenantDb(restaurantId: string) {
  return {
    restaurantId,
    menuItem: makeTenantModel(prisma.menuItem, restaurantId),
    menuCategory: makeTenantModel(prisma.menuCategory, restaurantId),
    order: makeTenantModel(prisma.order, restaurantId),
    reservation: makeTenantModel(prisma.reservation, restaurantId),
    cateringInquiry: makeTenantModel(prisma.cateringInquiry, restaurantId),
    eventBooking: makeTenantModel(prisma.eventBooking, restaurantId),
    staffUser: makeTenantModel(prisma.staffUser, restaurantId),
    customer: makeTenantModel(prisma.customer, restaurantId),
    review: makeTenantModel(prisma.review, restaurantId),
    promotion: makeTenantModel(prisma.promotion, restaurantId),
    loyaltyRule: makeTenantModel(prisma.loyaltyRule, restaurantId),
    galleryImage: makeTenantModel(prisma.galleryImage, restaurantId),
    jobPosting: makeTenantModel(prisma.jobPosting, restaurantId),
    operatingHours: makeTenantModel(prisma.operatingHours, restaurantId),
    operatingHoursOverride: makeTenantModel(prisma.operatingHoursOverride, restaurantId),
    restaurantTable: makeTenantModel(prisma.restaurantTable, restaurantId),
    branch: makeTenantModel(prisma.branch, restaurantId),
    notificationToken: makeTenantModel(prisma.notificationToken, restaurantId),
    aboutContent: {
      findUnique: (args?: any) =>
        prisma.aboutContent.findUnique({
          ...args,
          where: { ...args?.where, restaurantId },
        }),
      findFirst: (args?: any) =>
        prisma.aboutContent.findFirst({
          ...args,
          where: { ...(args?.where ?? {}), restaurantId },
        }),
      upsert: (args?: any) =>
        prisma.aboutContent.upsert({
          ...args,
          where: { restaurantId },
          create: { ...args?.create, restaurantId },
          update: args?.update ?? {},
        }),
    },
  };
}

export type TenantDb = ReturnType<typeof tenantDb>;
