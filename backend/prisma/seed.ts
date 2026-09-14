import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  ['products.view', 'products'],
  ['products.create', 'products'],
  ['products.update', 'products'],
  ['products.delete', 'products'],
  ['warehouses.view', 'warehouses'],
  ['warehouses.create', 'warehouses'],
  ['warehouses.update', 'warehouses'],
  ['warehouses.delete', 'warehouses'],
  ['stock.view', 'stock'],
  ['stock.receive', 'stock'],
  ['stock.issue', 'stock'],
  ['stock.transfer', 'stock'],
  ['stock.adjust', 'stock'],
  ['stock.count', 'stock'],
  ['reports.view', 'reports'],
  ['reports.export', 'reports'],
  ['users.view', 'users'],
  ['users.create', 'users'],
  ['users.update', 'users'],
  ['audit.view', 'audit'],
];

const ROLE_PERMISSIONS: Record<string, string[] | 'ALL'> = {
  SUPER_ADMIN: 'ALL',
  ADMIN: 'ALL',
  WAREHOUSE_MANAGER: [
    'products.view', 'products.create', 'products.update',
    'warehouses.view', 'warehouses.create', 'warehouses.update',
    'stock.view', 'stock.receive', 'stock.issue', 'stock.transfer', 'stock.adjust', 'stock.count',
    'reports.view', 'reports.export', 'users.view', 'audit.view',
  ],
  WAREHOUSE_OPERATOR: [
    'products.view', 'warehouses.view',
    'stock.view', 'stock.receive', 'stock.issue', 'stock.transfer', 'stock.count',
  ],
  INVENTORY_CONTROLLER: [
    'products.view', 'warehouses.view',
    'stock.view', 'stock.adjust', 'stock.count', 'reports.view',
  ],
  PURCHASING: ['products.view', 'warehouses.view', 'stock.view', 'stock.receive', 'reports.view'],
  SALES: ['products.view', 'warehouses.view', 'stock.view', 'stock.issue', 'reports.view'],
  AUDITOR: ['products.view', 'warehouses.view', 'stock.view', 'reports.view', 'audit.view'],
  VIEWER: ['products.view', 'warehouses.view', 'stock.view', 'reports.view'],
};

async function main() {
  console.log('Seeding permissions...');
  const permissionRecords: Record<string, string> = {};
  for (const [code, module] of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, module },
    });
    permissionRecords[code] = p.id;
  }

  console.log('Seeding roles...');
  for (const [roleCode, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: {},
      create: { code: roleCode, name: roleCode.replace(/_/g, ' ') },
    });

    const permCodes = perms === 'ALL' ? PERMISSIONS.map((p) => p[0]) : perms;
    for (const code of permCodes) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permissionRecords[code] } },
        update: {},
        create: { roleId: role.id, permissionId: permissionRecords[code] },
      });
    }
  }

  console.log('Seeding company/branch/warehouse...');
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Elite Developers Co. Ltd.' },
  });

  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000002', companyId: company.id, name: 'الفرع الرئيسي - جدة' },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      companyId: company.id,
      branchId: branch.id,
      code: 'WH-MAIN',
      name: 'المخزن الرئيسي',
      address: 'جدة، المملكة العربية السعودية',
    },
  });

  const location = await prisma.warehouseLocation.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'A-01' } },
    update: {},
    create: { warehouseId: warehouse.id, code: 'A-01', name: 'رف A-01' },
  });

  console.log('Seeding admin user...');
  const adminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@warehouse.local' },
    update: {},
    create: {
      email: 'admin@warehouse.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      branchId: branch.id,
      userRoles: adminRole ? { create: [{ roleId: adminRole.id }] } : undefined,
    },
  });

  console.log('Seeding UOM, category, sample products...');
  const uom = await prisma.unitOfMeasure.upsert({
    where: { code: 'PCS' },
    update: {},
    create: { code: 'PCS', name: 'قطعة / Piece' },
  });

  const category = await prisma.productCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000003', name: 'مواد غذائية - Food' },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'SKU-0001' },
    update: {},
    create: {
      nameAr: 'كرتونة مياه 600مل × 24',
      nameEn: 'Water bottle carton 600ml x24',
      sku: 'SKU-0001',
      barcode: '6281000000019',
      categoryId: category.id,
      uomId: uom.id,
      cost: 12.5,
      salePrice: 18,
      purchasePrice: 12.5,
      reorderPoint: 20,
      minimumStock: 10,
    },
  });

  console.log('Seed done.');
  console.log('----------------------------------------');
  console.log('Admin login: admin@warehouse.local / Admin@12345');
  console.log(`Warehouse: ${warehouse.name} (${warehouse.code}), Location: ${location.name}`);
  console.log(`Sample product: ${product.nameEn} (${product.sku})`);
  console.log('----------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
