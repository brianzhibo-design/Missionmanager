# TaskFlow Pro - 移动端设计系统 v2.0

> 专业级移动端设计系统，参考 Linear、Notion、Things 3 等顶级应用  
> 弥散阴影 + 大圆角 + 深色浮动导航 = 现代极简设计

---

## 设计理念

| 特点 | 说明 |
|------|------|
| **弥散阴影** | 多层柔和阴影替代硬边框，更有深度感 |
| **大圆角** | 20px+ 圆角，更现代更柔和 |
| **冷灰色系** | 蓝灰色调替代纯灰，更有高级感 |
| **深色悬浮导航** | 类似 Dynamic Island 的深色浮动导航栏 |
| **降低饱和度** | 功能色降低饱和度，更协调统一 |

---

## 1. 设计令牌

### 品牌色

```css
:root {
  /* 主色 - 现代蓝 */
  --pro-primary: #2563EB;
  --pro-primary-soft: #EFF6FF;
  --pro-primary-hover: #1D4ED8;
  
  /* 强调色 */
  --pro-purple: #7C3AED;
  --pro-purple-soft: #F5F3FF;
  --pro-teal: #0D9488;
  --pro-teal-soft: #F0FDFA;
  --pro-orange: #EA580C;
  --pro-orange-soft: #FFF7ED;
}
```

### 功能色

```css
:root {
  --pro-danger: #EF4444;
  --pro-danger-soft: #FEF2F2;
  --pro-warning: #F59E0B;
  --pro-warning-soft: #FFFBEB;
  --pro-success: #10B981;
  --pro-success-soft: #ECFDF5;
}
```

### 中性色

```css
:root {
  /* 背景 */
  --pro-bg-body: #F8FAFC;      /* 冷灰背景 */
  --pro-bg-card: #FFFFFF;
  --pro-bg-hover: #F1F5F9;
  --pro-bg-active: #E2E8F0;
  
  /* 文字 - 深蓝黑比纯黑柔和 */
  --pro-text-main: #0F172A;
  --pro-text-sub: #64748B;
  --pro-text-muted: #94A3B8;
  --pro-text-placeholder: #CBD5E1;
  
  /* 边框 */
  --pro-border: #E2E8F0;
  --pro-border-light: #F1F5F9;
}
```

### 圆角

```css
:root {
  --pro-radius-xs: 8px;
  --pro-radius-sm: 12px;
  --pro-radius-md: 16px;
  --pro-radius-lg: 20px;      /* 卡片默认 */
  --pro-radius-xl: 28px;      /* 抽屉/模态框 */
  --pro-radius-full: 100px;   /* 胶囊按钮 */
}
```

### 弥散阴影

```css
:root {
  --pro-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --pro-shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 
                   0 1px 2px -1px rgba(0, 0, 0, 0.1);
  --pro-shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 
                     0 4px 6px -2px rgba(0, 0, 0, 0.025);
  --pro-shadow-float: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
                      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --pro-shadow-nav: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}
```

---

## 2. Header - 大标题风格

![Header](https://via.placeholder.com/375x100/F8FAFC/0F172A?text=Header)

```html
<header class="pro-header">
  <div class="pro-header-date">
    <svg><!-- calendar icon --></svg>
    <span>12月20日 星期六</span>
  </div>
  <div class="pro-header-row">
    <h1 class="pro-header-title">工作台</h1>
    <div class="pro-header-avatar">
      <img src="avatar.jpg" alt="User">
    </div>
  </div>
</header>
```

```css
.pro-header {
  padding: calc(env(safe-area-inset-top) + 24px) 24px 12px;
  background: rgba(248, 250, 252, 0.9);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.pro-header-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.8px;
}

.pro-header-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px; /* 方圆形 */
  border: 2px solid #fff;
  box-shadow: var(--pro-shadow-xs);
}
```

---

## 3. 项目卡片 - 横向滚动

![Projects](https://via.placeholder.com/375x180/F8FAFC/0F172A?text=Projects)

```html
<div class="pro-projects-scroller">
  <div class="pro-project-card accent-blue">
    <div class="pro-project-top">
      <div class="pro-project-icon">
        <svg><!-- icon --></svg>
      </div>
      <div class="pro-project-meta">剩 3 天</div>
    </div>
    <div class="pro-project-info">
      <div class="pro-project-name">移动端重构</div>
      <div class="pro-mini-progress">
        <div class="pro-mini-bar blue" style="width: 75%;"></div>
      </div>
    </div>
  </div>
</div>
```

```css
.pro-project-card {
  flex: 0 0 240px;
  height: 140px;
  background: var(--pro-bg-card);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--pro-shadow-card);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.pro-project-icon {
  width: 44px;
  height: 44px;
  background: var(--pro-primary-soft);
  color: var(--pro-primary);
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.pro-mini-progress {
  height: 6px;
  background: var(--pro-bg-body);
  border-radius: 3px;
  margin-top: 12px;
}

.pro-mini-bar {
  height: 100%;
  border-radius: 3px;
  background: var(--pro-primary);
}
```

### 强调色变体

| 类名 | 图标背景 | 图标颜色 |
|------|----------|----------|
| `accent-blue` | `#EFF6FF` | `#2563EB` |
| `accent-purple` | `#F5F3FF` | `#7C3AED` |
| `accent-teal` | `#F0FDFA` | `#0D9488` |
| `accent-orange` | `#FFF7ED` | `#EA580C` |

---

## 4. 任务列表

![Tasks](https://via.placeholder.com/375x300/F8FAFC/0F172A?text=Tasks)

```html
<div class="pro-task-list">
  <div class="pro-task-item">
    <div class="pro-priority-dot high"></div>
    <div class="pro-checkbox">
      <svg><!-- check icon --></svg>
    </div>
    <div class="pro-task-content">
      <div class="pro-task-title">修复导航栏层级 Bug</div>
      <div class="pro-task-footer">
        <div class="pro-meta-item warning">
          <svg><!-- clock --></svg>
          <span>14:00</span>
        </div>
        <div class="pro-meta-item">
          <svg><!-- tag --></svg>
          <span>开发</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 优先级点

```css
.pro-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 8px;
}

.pro-priority-dot.high {
  background: #EF4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.pro-priority-dot.medium {
  background: #F59E0B;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.pro-priority-dot.low {
  background: var(--pro-bg-body);
  border: 2px solid var(--pro-border);
}
```

### 自定义复选框

```css
.pro-checkbox {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid #CBD5E1;
  display: grid;
  place-items: center;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
}

.pro-checkbox svg {
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.15s;
}

.pro-task-item.completed .pro-checkbox {
  background: var(--pro-primary);
  border-color: var(--pro-primary);
}

.pro-task-item.completed .pro-checkbox svg {
  opacity: 1;
  transform: scale(1);
}
```

---

## 5. 底部导航 - 深色浮动

![NavBar](https://via.placeholder.com/375x100/1E293B/FFFFFF?text=NavBar)

```html
<nav class="pro-nav-bar">
  <button class="pro-nav-item active">
    <svg><!-- list icon --></svg>
  </button>
  <button class="pro-nav-item">
    <svg><!-- folder icon --></svg>
  </button>
  
  <button class="pro-fab">
    <svg><!-- plus icon --></svg>
  </button>
  
  <button class="pro-nav-item">
    <svg><!-- users icon --></svg>
  </button>
  <button class="pro-nav-item">
    <svg><!-- settings icon --></svg>
  </button>
</nav>
```

```css
.pro-nav-bar {
  position: fixed;
  bottom: 24px;
  left: 24px;
  right: 24px;
  height: 64px;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  z-index: 100;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.pro-nav-item {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #94A3B8;
  background: transparent;
  border: none;
}

.pro-nav-item.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.pro-fab {
  width: 56px;
  height: 48px;
  border-radius: 24px;
  background: var(--pro-primary);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
  margin: 0 8px;
}
```

---

## 6. 底部抽屉

![Drawer](https://via.placeholder.com/375x350/FFFFFF/0F172A?text=Drawer)

```html
<div class="pro-overlay" id="overlay"></div>
<div class="pro-drawer" id="drawer">
  <div class="pro-drawer-header">
    <h3 class="pro-drawer-title">新建任务</h3>
    <button class="pro-drawer-close">
      <svg><!-- x icon --></svg>
    </button>
  </div>
  
  <input type="text" class="pro-drawer-input" placeholder="接下来做什么？">
  
  <div class="pro-action-row">
    <div class="pro-action-chip active">
      <svg><!-- calendar --></svg> 今天
    </div>
    <div class="pro-action-chip">
      <svg><!-- flag --></svg> 优先级
    </div>
  </div>

  <button class="pro-btn-submit">确认创建</button>
</div>
```

```css
.pro-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  backdrop-filter: blur(4px);
}

.pro-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.pro-drawer {
  position: fixed;
  bottom: 24px;
  left: 12px;
  right: 12px;
  background: var(--pro-bg-card);
  border-radius: 28px;
  padding: 24px;
  z-index: 201;
  transform: translateY(150%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--pro-shadow-float);
}

.pro-drawer.show {
  transform: translateY(0);
}

.pro-action-chip {
  padding: 8px 16px;
  background: var(--pro-bg-body);
  border: 1px solid var(--pro-border);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pro-text-sub);
}

.pro-action-chip.active {
  background: var(--pro-primary-soft);
  border-color: #BFDBFE;
  color: var(--pro-primary);
}

.pro-btn-submit {
  width: 100%;
  height: 52px;
  background: var(--pro-text-main);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}
```

---

## 7. 按钮系统

```html
<button class="pro-btn pro-btn-primary">主要按钮</button>
<button class="pro-btn pro-btn-secondary">次要按钮</button>
<button class="pro-btn pro-btn-ghost">幽灵按钮</button>
<button class="pro-btn pro-btn-danger">危险按钮</button>
```

```css
.pro-btn {
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 16px;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
}

.pro-btn:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.pro-btn-primary {
  background: var(--pro-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.pro-btn-secondary {
  background: var(--pro-bg-hover);
  color: var(--pro-text-main);
}

.pro-btn-ghost {
  background: transparent;
  color: var(--pro-primary);
}

.pro-btn-danger {
  background: var(--pro-danger);
  color: white;
}
```

---

## 8. 标签系统

```html
<span class="pro-tag">默认</span>
<span class="pro-tag pro-tag-blue">蓝色</span>
<span class="pro-tag pro-tag-purple">紫色</span>
<span class="pro-tag pro-tag-teal">青色</span>
<span class="pro-tag pro-tag-danger">危险</span>
<span class="pro-tag pro-tag-success">成功</span>
<span class="pro-tag pro-tag-warning">警告</span>
```

```css
.pro-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 13px;
  background: var(--pro-bg-hover);
  color: var(--pro-text-sub);
}

.pro-tag-blue {
  background: var(--pro-primary-soft);
  color: var(--pro-primary);
}

.pro-tag-purple {
  background: var(--pro-purple-soft);
  color: var(--pro-purple);
}

/* ... 其他颜色 */
```

---

## 9. 列表组件

```html
<div class="pro-list">
  <a class="pro-list-item" href="#">
    <div class="pro-list-icon">
      <svg><!-- icon --></svg>
    </div>
    <div class="pro-list-content">
      <div class="pro-list-title">设置项标题</div>
      <div class="pro-list-subtitle">设置项描述</div>
    </div>
    <div class="pro-list-value">值</div>
    <div class="pro-list-chevron">
      <svg><!-- chevron-right --></svg>
    </div>
  </a>
</div>
```

```css
.pro-list {
  background: var(--pro-bg-card);
  border-radius: 20px;
  overflow: hidden;
  margin: 0 24px;
  box-shadow: var(--pro-shadow-xs);
}

.pro-list-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 14px;
}

.pro-list-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 20px;
  right: 0;
  bottom: 0;
  height: 1px;
  background: var(--pro-border);
}

.pro-list-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--pro-bg-body);
  display: grid;
  place-items: center;
}
```

---

## 10. 统计卡片

```html
<div class="pro-stats-grid">
  <div class="pro-stat-card">
    <div class="pro-stat-value">12</div>
    <div class="pro-stat-label">进行中</div>
  </div>
  <div class="pro-stat-card">
    <div class="pro-stat-value">28</div>
    <div class="pro-stat-label">已完成</div>
  </div>
  <div class="pro-stat-card">
    <div class="pro-stat-value">85%</div>
    <div class="pro-stat-label">完成率</div>
  </div>
</div>
```

```css
.pro-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 0 24px;
}

.pro-stat-card {
  background: var(--pro-bg-card);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: var(--pro-shadow-xs);
  border: 1px solid var(--pro-border);
}

.pro-stat-value {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

.pro-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--pro-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}
```

---

## 11. 空状态

```html
<div class="pro-empty">
  <div class="pro-empty-icon">📋</div>
  <h3 class="pro-empty-title">暂无任务</h3>
  <p class="pro-empty-desc">点击下方按钮创建第一个任务</p>
  <button class="pro-btn pro-btn-primary">新建任务</button>
</div>
```

---

## 12. 骨架屏

```html
<div class="pro-skeleton pro-skeleton-card"></div>
<div class="pro-skeleton pro-skeleton-text"></div>
<div class="pro-skeleton pro-skeleton-text short"></div>
```

```css
.pro-skeleton {
  background: linear-gradient(
    90deg,
    var(--pro-bg-hover) 0%,
    var(--pro-bg-body) 50%,
    var(--pro-bg-hover) 100%
  );
  background-size: 200% 100%;
  animation: pro-shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes pro-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## 13. 工具类

### 间距

```css
.pro-p-4 { padding: 16px; }
.pro-p-6 { padding: 24px; }
.pro-px-4 { padding-left: 16px; padding-right: 16px; }
.pro-py-4 { padding-top: 16px; padding-bottom: 16px; }
.pro-mt-4 { margin-top: 16px; }
.pro-mb-4 { margin-bottom: 16px; }
```

### Flex

```css
.pro-flex { display: flex; }
.pro-flex-col { flex-direction: column; }
.pro-items-center { align-items: center; }
.pro-justify-between { justify-content: space-between; }
.pro-gap-2 { gap: 8px; }
.pro-gap-4 { gap: 16px; }
```

### 文字

```css
.pro-text-main { color: var(--pro-text-main); }
.pro-text-sub { color: var(--pro-text-sub); }
.pro-text-primary { color: var(--pro-primary); }
.pro-font-semibold { font-weight: 600; }
.pro-font-bold { font-weight: 700; }
.pro-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

### 安全区域

```css
.pro-safe-top { padding-top: env(safe-area-inset-top); }
.pro-safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

---

## 14. 深色模式

Pro 设计系统完整支持深色模式，只需添加 `[data-theme="dark"]` 属性：

```html
<body data-theme="dark">
  ...
</body>
```

深色模式自动调整：
- 背景色变为深蓝黑 (`#0F172A`)
- 卡片变为深灰 (`#1E293B`)
- 文字变为浅色
- 阴影加深
- 导航栏添加边框

---

## 15. 文件结构

```
frontend/src/styles/
├── mobile.css          # 原版移动端样式
├── mobile-pro.css      # Pro 版移动端样式 ⭐
└── ...

docs/
├── 移动端UI设计系统.md         # 原版文档
└── 移动端UI设计系统-Pro版.md   # Pro 版文档 ⭐
```

---

## 16. 使用方法

### 引入 CSS

```tsx
// 在 main.tsx 或 App.tsx 中
import './styles/mobile-pro.css';
```

### 使用 Lucide 图标

```html
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  lucide.createIcons();
</script>
```

或使用 React 版本：

```tsx
import { Calendar, Plus, Check } from 'lucide-react';

<Calendar className="icon" />
```

---

## 17. 响应式断点

| 断点 | 说明 |
|------|------|
| `≤768px` | 移动端样式生效 |
| `≤375px` | 小屏手机适配（iPhone SE/Mini） |

---

*Pro 设计系统 v2.0*  
*最后更新: 2025-12-20*



