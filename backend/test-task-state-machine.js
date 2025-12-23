/**
 * 任务状态机逻辑测试脚本
 * 运行: node test-task-state-machine.js
 */

// 模拟状态机定义
const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
};

const STATE_TRANSITIONS = {
  todo: ['in_progress'],
  in_progress: ['todo', 'review', 'done'],
  review: ['in_progress', 'done'],
  done: ['in_progress'],
};

const STATUS_LABELS = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

function canTransition(from, to) {
  if (from === to) return true;
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

function getAvailableTransitions(currentStatus) {
  return STATE_TRANSITIONS[currentStatus] || [];
}

function isValidStatus(status) {
  return Object.values(TaskStatus).includes(status);
}

console.log('🧪 开始测试任务状态机逻辑...\n');

// ==================== 测试 1: 状态枚举 ====================
console.log('📋 测试 1: 状态枚举');
const actualStates = Object.values(TaskStatus);
console.log('状态列表:', actualStates);
console.log('状态数量:', actualStates.length);

if (actualStates.includes('blocked')) {
  console.error('❌ 错误: 仍然包含 blocked 状态！');
  process.exit(1);
}
if (actualStates.length !== 4) {
  console.error(`❌ 错误: 状态数量不正确，期望 4 个，实际 ${actualStates.length} 个`);
  process.exit(1);
}
console.log('✅ 状态枚举正确（4个状态，无 blocked）\n');

// ==================== 测试 2: 状态转换规则 ====================
console.log('📋 测试 2: 状态转换规则');

const testCases = [
  // 合法转换
  { from: 'todo', to: 'in_progress', expected: true, desc: '待办 → 进行中' },
  { from: 'in_progress', to: 'todo', expected: true, desc: '进行中 → 待办' },
  { from: 'in_progress', to: 'review', expected: true, desc: '进行中 → 审核中' },
  { from: 'in_progress', to: 'done', expected: true, desc: '进行中 → 已完成（直接完成）' },
  { from: 'review', to: 'in_progress', expected: true, desc: '审核中 → 进行中（退回）' },
  { from: 'review', to: 'done', expected: true, desc: '审核中 → 已完成（审核通过）' },
  { from: 'done', to: 'in_progress', expected: true, desc: '已完成 → 进行中（重新打开）' },
  
  // 非法转换
  { from: 'todo', to: 'done', expected: false, desc: '待办 → 已完成（应禁止）' },
  { from: 'todo', to: 'review', expected: false, desc: '待办 → 审核中（应禁止）' },
  { from: 'review', to: 'todo', expected: false, desc: '审核中 → 待办（应禁止）' },
  { from: 'done', to: 'todo', expected: false, desc: '已完成 → 待办（应禁止）' },
  { from: 'done', to: 'review', expected: false, desc: '已完成 → 审核中（应禁止）' },
  
  // 相同状态
  { from: 'todo', to: 'todo', expected: true, desc: '待办 → 待办（相同状态）' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ from, to, expected, desc }) => {
  const result = canTransition(from, to);
  if (result === expected) {
    console.log(`✅ ${desc}: ${result}`);
    passed++;
  } else {
    console.error(`❌ ${desc}: 期望 ${expected}，实际 ${result}`);
    failed++;
  }
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败\n`);

if (failed > 0) {
  console.error('❌ 状态转换规则测试失败！');
  process.exit(1);
}

// ==================== 测试 3: 可转换状态列表 ====================
console.log('📋 测试 3: 可转换状态列表');

const expectedTransitions = {
  todo: ['in_progress'],
  in_progress: ['todo', 'review', 'done'],
  review: ['in_progress', 'done'],
  done: ['in_progress'],
};

Object.entries(expectedTransitions).forEach(([status, expected]) => {
  const actual = getAvailableTransitions(status);
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  
  if (JSON.stringify(actualSorted) === JSON.stringify(expectedSorted)) {
    console.log(`✅ ${status}: [${actual.join(', ')}]`);
  } else {
    console.error(`❌ ${status}: 期望 [${expected.join(', ')}]，实际 [${actual.join(', ')}]`);
    process.exit(1);
  }
});

console.log('');

// ==================== 测试 4: 状态验证 ====================
console.log('📋 测试 4: 状态验证');

const validStatuses = ['todo', 'in_progress', 'review', 'done'];
const invalidStatuses = ['blocked', 'pending', 'cancelled', ''];

validStatuses.forEach(status => {
  if (isValidStatus(status)) {
    console.log(`✅ "${status}" 是有效状态`);
  } else {
    console.error(`❌ "${status}" 应该是有效状态`);
    process.exit(1);
  }
});

invalidStatuses.forEach(status => {
  if (!isValidStatus(status)) {
    console.log(`✅ "${status}" 正确识别为无效状态`);
  } else {
    console.error(`❌ "${status}" 不应该是有效状态`);
    process.exit(1);
  }
});

console.log('');

// ==================== 测试 5: 状态标签 ====================
console.log('📋 测试 5: 状态标签');

const expectedLabels = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

Object.entries(expectedLabels).forEach(([status, expectedLabel]) => {
  const actualLabel = STATUS_LABELS[status];
  if (actualLabel === expectedLabel) {
    console.log(`✅ ${status}: "${actualLabel}"`);
  } else {
    console.error(`❌ ${status}: 期望 "${expectedLabel}"，实际 "${actualLabel}"`);
    process.exit(1);
  }
});

if (STATUS_LABELS['blocked']) {
  console.error('❌ 错误: STATUS_LABELS 中仍然包含 blocked！');
  process.exit(1);
}

console.log('');

// ==================== 测试 6: 完整状态流转路径 ====================
console.log('📋 测试 6: 完整状态流转路径');

const paths = [
  {
    name: '标准审核流程',
    steps: [
      { from: 'todo', to: 'in_progress', action: '开始任务' },
      { from: 'in_progress', to: 'review', action: '提交审核' },
      { from: 'review', to: 'done', action: '审核通过' },
    ],
  },
  {
    name: '直接完成流程',
    steps: [
      { from: 'todo', to: 'in_progress', action: '开始任务' },
      { from: 'in_progress', to: 'done', action: '直接完成' },
    ],
  },
  {
    name: '退回修改流程',
    steps: [
      { from: 'todo', to: 'in_progress', action: '开始任务' },
      { from: 'in_progress', to: 'review', action: '提交审核' },
      { from: 'review', to: 'in_progress', action: '退回修改' },
      { from: 'in_progress', to: 'review', action: '重新提交审核' },
      { from: 'review', to: 'done', action: '审核通过' },
    ],
  },
  {
    name: '重新打开流程',
    steps: [
      { from: 'done', to: 'in_progress', action: '重新打开' },
      { from: 'in_progress', to: 'done', action: '直接完成' },
    ],
  },
];

paths.forEach(({ name, steps }) => {
  console.log(`\n路径: ${name}`);
  let currentStatus = steps[0].from;
  
  steps.forEach(({ from, to, action }, index) => {
    if (currentStatus !== from) {
      console.error(`❌ 步骤 ${index + 1}: 状态不匹配，期望 ${from}，实际 ${currentStatus}`);
      process.exit(1);
    }
    
    if (!canTransition(from, to)) {
      console.error(`❌ 步骤 ${index + 1}: ${action} - 无法从 ${from} 转换到 ${to}`);
      process.exit(1);
    }
    
    console.log(`  ✅ ${index + 1}. ${action}: ${from} → ${to}`);
    currentStatus = to;
  });
});

console.log('\n✅ 所有状态流转路径测试通过\n');

// ==================== 测试 7: API 端点验证 ====================
console.log('📋 测试 7: API 端点验证');

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/controllers/taskController.ts');
const controllerContent = fs.readFileSync(controllerPath, 'utf-8');

const requiredEndpoints = [
  { pattern: 'POST.*/:id/start', name: '开始任务' },
  { pattern: 'POST.*/:id/submit-review', name: '提交审核' },
  { pattern: 'POST.*/:id/approve', name: '审核通过' },
  { pattern: 'POST.*/:id/reject', name: '退回修改' },
  { pattern: 'POST.*/:id/complete', name: '直接完成' },
  { pattern: 'POST.*/:id/reopen', name: '重新打开' },
];

console.log('检查 API 端点:');
let allEndpointsFound = true;

requiredEndpoints.forEach(({ pattern, name }) => {
  const regex = new RegExp(pattern);
  if (regex.test(controllerContent)) {
    console.log(`  ✅ ${name}: 找到`);
  } else {
    console.error(`  ❌ ${name}: 未找到`);
    allEndpointsFound = false;
  }
});

if (!allEndpointsFound) {
  console.error('\n❌ 部分 API 端点未找到！');
  process.exit(1);
}

console.log('');

// ==================== 测试 8: 检查 blocked 残留 ====================
console.log('📋 测试 8: 检查 blocked 残留');

const filesToCheck = [
  'src/domain/taskStateMachine.ts',
  'src/services/taskService.ts',
  'src/controllers/taskController.ts',
];

let foundBlocked = false;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    // 检查是否包含 blocked 状态定义（排除注释）
    // 移除注释行
    const contentWithoutComments = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    const blockedPatterns = [
      /BLOCKED:\s*['"]blocked['"]/,  // TaskStatus.BLOCKED = 'blocked'
      /blocked:\s*\[/,                 // blocked: [...]
      /status\s*[=:]\s*['"]blocked['"]/,  // status = 'blocked'
      /TaskStatus\.BLOCKED/,          // TaskStatus.BLOCKED
      /'blocked'|"blocked"/,         // 'blocked' 或 "blocked"（作为状态值）
    ];
    
    blockedPatterns.forEach((pattern) => {
      if (pattern.test(contentWithoutComments)) {
        const matches = contentWithoutComments.match(pattern);
        console.error(`❌ ${file}: 发现 blocked 相关代码: ${matches ? matches[0] : pattern}`);
        foundBlocked = true;
      }
    });
  }
});

if (!foundBlocked) {
  console.log('✅ 未发现 blocked 残留代码');
} else {
  console.error('❌ 发现 blocked 残留代码，需要清理！');
  process.exit(1);
}

console.log('');

// ==================== 总结 ====================
console.log('🎉 所有测试通过！');
console.log('\n📊 测试总结:');
console.log(`  - 状态数量: ${Object.values(TaskStatus).length} 个`);
console.log(`  - 状态转换规则: ${testCases.length} 个测试用例全部通过`);
console.log(`  - 状态验证: 通过`);
console.log(`  - 状态标签: 通过`);
console.log(`  - 状态流转路径: ${paths.length} 条路径全部通过`);
console.log(`  - API 端点: ${requiredEndpoints.length} 个全部找到`);
console.log(`  - blocked 残留检查: 通过`);
console.log('\n✅ 任务状态机逻辑测试完成！\n');






