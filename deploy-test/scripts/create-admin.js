const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🚀 开始创建管理员账号...\n');
  
  // 创建管理员账号
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email: 'admin@example.com',
      name: '系统管理员',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  
  console.log('✅ 管理员账号创建成功!');
  console.log('   邮箱: admin@example.com');
  console.log('   密码: admin123');
  console.log('   角色: ADMIN\n');
  
  // 创建测试账号
  console.log('📝 创建测试账号...\n');
  
  const testAccounts = [
    { email: 'test1@example.com', name: '测试用户1', password: 'test123', role: 'USER', status: 'ACTIVE' },
    { email: 'test2@example.com', name: '测试用户2', password: 'test123', role: 'USER', status: 'INACTIVE' },
    { email: 'guest@example.com', name: '访客用户', password: 'guest123', role: 'GUEST', status: 'ACTIVE' },
    { email: 'pm@example.com', name: '产品经理', password: 'pm123456', role: 'USER', status: 'ACTIVE' },
    { email: 'dev@example.com', name: '开发人员', password: 'dev123456', role: 'USER', status: 'ACTIVE' },
    { email: 'qa@example.com', name: '测试工程师', password: 'qa123456', role: 'USER', status: 'ACTIVE' },
  ];
  
  for (const account of testAccounts) {
    const hashedPwd = await bcrypt.hash(account.password, 10);
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        email: account.email,
        name: account.name,
        password: hashedPwd,
        role: account.role,
        status: account.status,
      },
    });
    console.log(`✅ ${account.name} (${account.email}) [${account.role}]`);
  }
  
  console.log('\n📊 ========== 账号库清单 ==========');
  console.log('\n【管理员账号】');
  console.log('  admin@example.com    | 系统管理员 | 密码: admin123');
  
  console.log('\n【测试账号】');
  console.log('  test1@example.com    | 测试用户1  | 密码: test123   | 状态: 活跃');
  console.log('  test2@example.com    | 测试用户2  | 密码: test123   | 状态: 禁用');
  console.log('  guest@example.com    | 访客用户   | 密码: guest123  | 状态: 活跃');
  console.log('  pm@example.com       | 产品经理   | 密码: pm123456  | 状态: 活跃');
  console.log('  dev@example.com      | 开发人员   | 密码: dev123456 | 状态: 活跃');
  console.log('  qa@example.com       | 测试工程师 | 密码: qa123456  | 状态: 活跃');
  console.log('  demo@example.com     | Demo User  | 密码: password123 | 状态: 活跃');
  
  console.log('\n💡 提示: 使用管理员账号登录后可访问 /admin/users 管理所有账号');
  console.log('=====================================\n');
  
  await prisma.$disconnect();
}

createAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
