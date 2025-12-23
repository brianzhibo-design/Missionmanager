/**
 * 任务状态机安全测试脚本
 * 测试所有可能绕过状态机的路径
 * 运行: node test-task-security.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 开始任务状态机安全测试...\n');

// ==================== 测试 1: 创建任务时禁止设置非 todo 状态 ====================
console.log('📋 测试 1: 创建任务时的状态限制');

const taskServicePath = path.join(__dirname, 'src/services/taskService.ts');
const taskServiceContent = fs.readFileSync(taskServicePath, 'utf-8');

// 检查 create 方法是否强制新任务为 todo
const createMethodMatch = taskServiceContent.match(/async create\([^)]+\)\s*\{[\s\S]*?\n\s*return task;/);
if (!createMethodMatch) {
  console.error('❌ 无法找到 create 方法');
  process.exit(1);
}

const createMethod = createMethodMatch[0];

// 检查是否强制设置 status 为 todo
const forcesTodoStatus = /status\s*[:=]\s*['"]todo['"]|status\s*[:=]\s*TaskStatus\.TODO/.test(createMethod);
const allowsStatusParam = /data\.status/.test(createMethod);

if (allowsStatusParam && !forcesTodoStatus) {
  console.error('❌ 安全问题: create 方法允许在创建时设置任意状态！');
  console.error('   应该强制新任务只能为 todo 状态');
  process.exit(1);
}

if (forcesTodoStatus) {
  console.log('✅ create 方法强制新任务为 todo 状态');
} else if (!allowsStatusParam) {
  console.log('✅ create 方法不接受 status 参数（安全）');
} else {
  console.log('⚠️  create 方法允许 status 参数，但未强制为 todo（需要检查）');
}

console.log('');

// ==================== 测试 2: 批量更新是否使用状态机验证 ====================
console.log('📋 测试 2: 批量更新状态的安全检查');

const batchUpdateMatch = taskServiceContent.match(/async batchUpdateStatus\([^)]+\)\s*\{[\s\S]*?return results;/);
if (!batchUpdateMatch) {
  console.error('❌ 无法找到 batchUpdateStatus 方法');
  process.exit(1);
}

const batchUpdateMethod = batchUpdateMethod[0];

// 检查是否使用 canTransition
const usesCanTransition = /canTransition/.test(batchUpdateMethod);
const usesStateMachine = /STATE_TRANSITIONS|canTransition/.test(batchUpdateMethod);

if (!usesCanTransition) {
  console.error('❌ 安全问题: batchUpdateStatus 未使用状态机验证！');
  console.error('   可能允许绕过审核流程直接完成任务');
  process.exit(1);
}

console.log('✅ batchUpdateStatus 使用状态机验证（canTransition）');
console.log('');

// ==================== 测试 3: update 方法禁止修改 status ====================
console.log('📋 测试 3: update 方法禁止修改状态');

const updateMethodMatch = taskServiceContent.match(/async update\([^)]+\)\s*\{[\s\S]*?return updatedTask;/);
if (!updateMethodMatch) {
  console.error('❌ 无法找到 update 方法');
  process.exit(1);
}

const updateMethod = updateMethodMatch[0];

// 检查是否禁止修改 status
const blocksStatusUpdate = /if\s*\(['"]status['"]\s+in\s+data\)|if\s*\(data\.status\)|禁止.*status|不能.*修改.*状态/i.test(updateMethod);

if (!blocksStatusUpdate) {
  console.error('❌ 安全问题: update 方法未禁止修改 status！');
  console.error('   应该抛出错误禁止直接修改状态');
  process.exit(1);
}

console.log('✅ update 方法禁止直接修改 status');
console.log('');

// ==================== 测试 4: 检查所有状态转换 API ====================
console.log('📋 测试 4: 专用状态转换 API 完整性');

const controllerPath = path.join(__dirname, 'src/controllers/taskController.ts');
const controllerContent = fs.readFileSync(controllerPath, 'utf-8');

const requiredAPIs = [
  { pattern: 'POST.*/:id/start', name: '开始任务', from: 'todo', to: 'in_progress' },
  { pattern: 'POST.*/:id/submit-review', name: '提交审核', from: 'in_progress', to: 'review' },
  { pattern: 'POST.*/:id/approve', name: '审核通过', from: 'review', to: 'done' },
  { pattern: 'POST.*/:id/reject', name: '退回修改', from: 'review', to: 'in_progress' },
  { pattern: 'POST.*/:id/complete', name: '直接完成', from: 'in_progress', to: 'done' },
  { pattern: 'POST.*/:id/reopen', name: '重新打开', from: 'done', to: 'in_progress' },
];

let allAPIsFound = true;
requiredAPIs.forEach(({ pattern, name, from, to }) => {
  const regex = new RegExp(pattern);
  if (regex.test(controllerContent)) {
    console.log(`  ✅ ${name}: ${from} → ${to}`);
  } else {
    console.error(`  ❌ ${name}: 未找到`);
    allAPIsFound = false;
  }
});

if (!allAPIsFound) {
  console.error('\n❌ 部分状态转换 API 缺失！');
  process.exit(1);
}

console.log('');

// ==================== 测试 5: 检查通用状态更新 API ====================
console.log('📋 测试 5: 通用状态更新 API 的安全性');

// 检查 PATCH /tasks/:id/status 是否仍然存在
const hasGenericStatusAPI = /PATCH.*\/:id\/status|patch.*status/i.test(controllerContent);

if (hasGenericStatusAPI) {
  console.log('⚠️  发现通用状态更新 API (PATCH /tasks/:id/status)');
  console.log('   检查是否使用状态机验证...');
  
  // 检查是否调用 changeStatus 方法
  const callsChangeStatus = /changeStatus/.test(controllerContent);
  if (callsChangeStatus) {
    // 检查 changeStatus 是否使用状态机
    const changeStatusMatch = taskServiceContent.match(/async changeStatus\([^)]+\)\s*\{[\s\S]*?return/);
    if (changeStatusMatch) {
      const changeStatusMethod = changeStatusMatch[0];
      if (/canTransition/.test(changeStatusMethod)) {
        console.log('  ✅ changeStatus 使用状态机验证');
      } else {
        console.error('  ❌ changeStatus 未使用状态机验证！');
        process.exit(1);
      }
    }
  }
} else {
  console.log('✅ 未发现通用状态更新 API（推荐：完全移除）');
}

console.log('');

// ==================== 测试 6: AI 拆解任务创建子任务 ====================
console.log('📋 测试 6: AI 拆解任务的安全性');

// 检查前端如何创建子任务
const frontendTaskServicePath = path.join(__dirname, '../frontend/src/services/task.ts');
if (fs.existsSync(frontendTaskServicePath)) {
  const frontendContent = fs.readFileSync(frontendTaskServicePath, 'utf-8');
  
  // 检查 createTask 是否允许设置 status
  const createTaskMatch = frontendContent.match(/createTask\s*\([^)]+\)\s*\{[\s\S]*?\}/);
  if (createTaskMatch) {
    const createTaskMethod = createTaskMatch[0];
    // 检查是否传递 status 参数
    const passesStatus = /status/.test(createTaskMethod);
    
    if (passesStatus) {
      console.log('⚠️  前端 createTask 可能传递 status 参数');
      console.log('   需要检查后端是否强制为 todo');
    } else {
      console.log('✅ 前端 createTask 不传递 status 参数');
    }
  }
}

// 检查后端 create 方法如何处理子任务
if (/parentId/.test(createMethod)) {
  console.log('✅ 支持创建子任务');
  // 检查子任务是否强制为 todo
  if (forcesTodoStatus) {
    console.log('✅ 子任务创建时强制为 todo 状态');
  }
} else {
  console.log('⚠️  未找到子任务创建逻辑');
}

console.log('');

// ==================== 测试 7: 数据库默认值 ====================
console.log('📋 测试 7: 数据库默认值检查');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  // 检查 status 字段的默认值
  const statusFieldMatch = schemaContent.match(/status\s+String[^@]*@default\(['"]([^'"]+)['"]\)/);
  if (statusFieldMatch) {
    const defaultValue = statusFieldMatch[1];
    if (defaultValue === 'todo') {
      console.log('✅ 数据库 status 默认值为 todo');
    } else {
      console.error(`❌ 数据库 status 默认值不正确: ${defaultValue}，应该是 'todo'`);
      process.exit(1);
    }
  } else {
    console.log('⚠️  未找到 status 字段的默认值（需要检查）');
  }
} else {
  console.log('⚠️  未找到 schema.prisma 文件');
}

console.log('');

// ==================== 总结 ====================
console.log('🎉 安全测试完成！');
console.log('\n📊 测试总结:');
console.log('  - 创建任务状态限制: 通过');
console.log('  - 批量更新状态验证: 通过');
console.log('  - update 方法状态保护: 通过');
console.log('  - 专用状态转换 API: 完整');
console.log('  - 通用状态更新 API: 已检查');
console.log('  - AI 拆解任务: 已检查');
console.log('  - 数据库默认值: 已检查');
console.log('\n✅ 任务状态机安全测试完成！\n');




