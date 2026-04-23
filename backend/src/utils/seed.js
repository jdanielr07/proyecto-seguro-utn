'use strict';

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  const adminHash = await bcrypt.hash('Admin@2026!', BCRYPT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@proyecto.local',
      passwordHash: adminHash,
      rol: 'SUPERADMIN',
    },
  });
  console.log(`✅ SuperAdmin creado: ${admin.username}`);

  const auditorHash = await bcrypt.hash('Auditor@2026!', BCRYPT_ROUNDS);
  const auditor = await prisma.user.upsert({
    where: { username: 'auditor1' },
    update: {},
    create: {
      username: 'auditor1',
      email: 'auditor@proyecto.local',
      passwordHash: auditorHash,
      rol: 'AUDITOR',
    },
  });
  console.log(`✅ Auditor creado: ${auditor.username}`);

  const regHash = await bcrypt.hash('Registrador@2026!', BCRYPT_ROUNDS);
  const registrador = await prisma.user.upsert({
    where: { username: 'registrador1' },
    update: {},
    create: {
      username: 'registrador1',
      email: 'registrador@proyecto.local',
      passwordHash: regHash,
      rol: 'REGISTRADOR',
    },
  });
  console.log(`✅ Registrador creado: ${registrador.username}`);

  const productos = [
    { code: 'PROD-001', name: 'Laptop Dell XPS 15',      description: 'Laptop de alto rendimiento con procesador Intel i7', quantity: 10, price: 1299.99 },
    { code: 'PROD-002', name: 'Monitor LG 27"',          description: 'Monitor IPS 4K con HDR', quantity: 25, price: 449.50 },
    { code: 'PROD-003', name: 'Teclado Mecánico Keychron', description: 'Teclado inalámbrico con switches Brown', quantity: 50, price: 89.99 },
    { code: 'PROD-004', name: 'Mouse Logitech MX Master', description: 'Mouse ergonómico para productividad', quantity: 40, price: 99.00 },
    { code: 'PROD-005', name: 'Headset Sony WH-1000XM5', description: 'Audífonos con cancelación de ruido', quantity: 15, price: 349.99 },
  ];

  for (const p of productos) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    console.log(`✅ Producto creado: ${p.code} - ${p.name}`);
  }

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('   SuperAdmin:   superadmin / Admin@2026!');
  console.log('   Auditor:      auditor1   / Auditor@2026!');
  console.log('   Registrador:  registrador1 / Registrador@2026!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
