const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const dept = await prisma.department.findUnique({ where: { name: 'IT' } });
  const sl = await prisma.serviceLine.findFirst({ where: { name: 'Development' } });
  console.log('DEPT_ID=' + (dept ? dept.id : 'NOT_FOUND'));
  console.log('SL_ID=' + (sl ? sl.id : 'NOT_FOUND'));
}
main().then(async () => await prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); });
