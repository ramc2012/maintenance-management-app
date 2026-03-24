const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' }
  });
  console.log('Department IT:', dept.id);

  let sl = await prisma.serviceLine.findFirst({
    where: { name: 'Development', departmentId: dept.id }
  });

  if (!sl) {
    sl = await prisma.serviceLine.create({
      data: { name: 'Development', departmentId: dept.id }
    });
  }
  console.log('ServiceLine Development:', sl.id);
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
