# TaskFlow 移动端 UI 设计系统

> 专业级 iOS 风格移动端设计系统  
> 参考: iOS Human Interface Guidelines, Material Design 3, Linear, Things 3, Notion

---

## 目录

1. [设计令牌 (Design Tokens)](#1-设计令牌)
2. [基础重置](#2-基础重置)
3. [导航栏组件](#3-导航栏组件)
4. [列表组件](#4-列表组件)
5. [卡片组件](#5-卡片组件)
6. [按钮系统](#6-按钮系统)
7. [分段控制器](#7-分段控制器)
8. [搜索栏](#8-搜索栏)
9. [表单元素](#9-表单元素)
10. [底部操作表](#10-底部操作表)
11. [Toast 通知](#11-toast-通知)
12. [骨架屏加载](#12-骨架屏加载)
13. [徽章与标签](#13-徽章与标签)
14. [进度环](#14-进度环)
15. [空状态](#15-空状态)
16. [触控反馈](#16-触控反馈)
17. [辅助类](#17-辅助类)
18. [底部导航栏](#18-底部导航栏)
19. [页面组件样式](#19-页面组件样式)
20. [小屏适配](#20-小屏适配)

---

## 1. 设计令牌

### CSS 变量定义

```css
@media (max-width: 768px) {
  :root {
    /* ===== 系统色彩 ===== */
    --mobile-blue: #007AFF;
    --mobile-green: #34C759;
    --mobile-orange: #FF9500;
    --mobile-red: #FF3B30;
    --mobile-purple: #AF52DE;
    --mobile-pink: #FF2D55;
    --mobile-teal: #5AC8FA;
    --mobile-indigo: #5856D6;
    
    /* ===== 背景色 ===== */
    --mobile-bg-primary: #F2F2F7;
    --mobile-bg-secondary: #FFFFFF;
    --mobile-bg-tertiary: #FFFFFF;
    --mobile-bg-grouped: #F2F2F7;
    
    /* ===== 分隔线 ===== */
    --mobile-separator: rgba(60, 60, 67, 0.12);
    --mobile-separator-opaque: #C6C6C8;
    
    /* ===== 文字色 ===== */
    --mobile-label: #000000;
    --mobile-label-secondary: rgba(60, 60, 67, 0.6);
    --mobile-label-tertiary: rgba(60, 60, 67, 0.3);
    --mobile-label-quaternary: rgba(60, 60, 67, 0.18);
    
    /* ===== 填充色 ===== */
    --mobile-fill: rgba(120, 120, 128, 0.2);
    --mobile-fill-secondary: rgba(120, 120, 128, 0.16);
    --mobile-fill-tertiary: rgba(118, 118, 128, 0.12);
    
    /* ===== 毛玻璃效果 ===== */
    --mobile-glass-bg: rgba(255, 255, 255, 0.72);
    --mobile-glass-blur: 20px;
    
    /* ===== 圆角 ===== */
    --mobile-radius-sm: 8px;
    --mobile-radius-md: 12px;
    --mobile-radius-lg: 16px;
    --mobile-radius-xl: 22px;
    --mobile-radius-card: 14px;
    
    /* ===== 间距 ===== */
    --mobile-inset: 16px;
    --mobile-inset-grouped: 20px;
    --mobile-gap-sm: 8px;
    --mobile-gap-md: 12px;
    --mobile-gap-lg: 16px;
    
    /* ===== 字体 ===== */
    --mobile-font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', sans-serif;
    --mobile-font-rounded: -apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Helvetica Neue', sans-serif;
    
    /* ===== 字号 ===== */
    --mobile-text-caption2: 11px;
    --mobile-text-caption1: 12px;
    --mobile-text-footnote: 13px;
    --mobile-text-subhead: 15px;
    --mobile-text-callout: 16px;
    --mobile-text-body: 17px;
    --mobile-text-headline: 17px;
    --mobile-text-title3: 20px;
    --mobile-text-title2: 22px;
    --mobile-text-title1: 28px;
    --mobile-text-large-title: 34px;
    
    /* ===== 触控尺寸 ===== */
    --mobile-touch-min: 44px;
    --mobile-touch-comfortable: 48px;
    
    /* ===== 安全区域 ===== */
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
    
    /* ===== 动画 ===== */
    --mobile-duration-instant: 0.1s;
    --mobile-duration-fast: 0.2s;
    --mobile-duration-normal: 0.3s;
    --mobile-duration-slow: 0.45s;
    
    /* ===== 动画曲线 ===== */
    --mobile-spring: cubic-bezier(0.2, 0.8, 0.2, 1);
    --mobile-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
    --mobile-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  }
}
```

### 深色模式

```css
[data-theme="dark"] {
  --mobile-bg-primary: #000000;
  --mobile-bg-secondary: #1C1C1E;
  --mobile-bg-tertiary: #2C2C2E;
  --mobile-bg-grouped: #000000;
  
  --mobile-separator: rgba(84, 84, 88, 0.65);
  --mobile-separator-opaque: #38383A;
  
  --mobile-label: #FFFFFF;
  --mobile-label-secondary: rgba(235, 235, 245, 0.6);
  --mobile-label-tertiary: rgba(235, 235, 245, 0.3);
  --mobile-label-quaternary: rgba(235, 235, 245, 0.18);
  
  --mobile-fill: rgba(120, 120, 128, 0.36);
  --mobile-fill-secondary: rgba(120, 120, 128, 0.32);
  --mobile-fill-tertiary: rgba(118, 118, 128, 0.24);
  
  --mobile-glass-bg: rgba(30, 30, 30, 0.72);
}
```

---

## 2. 基础重置

```css
@media (max-width: 768px) {
  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  body {
    font-family: var(--mobile-font);
    font-size: var(--mobile-text-body);
    line-height: 1.47059;
    letter-spacing: -0.022em;
    background-color: var(--mobile-bg-grouped);
    color: var(--mobile-label);
    overscroll-behavior-y: none;
    -webkit-overflow-scrolling: touch;
  }
  
  /* 隐藏滚动条 */
  ::-webkit-scrollbar {
    display: none;
  }
  
  * {
    scrollbar-width: none;
  }
}
```

---

## 3. 导航栏组件

### 标准导航栏

```css
@media (max-width: 768px) {
  .mobile-navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--mobile-glass-bg);
    backdrop-filter: saturate(180%) blur(var(--mobile-glass-blur));
    -webkit-backdrop-filter: saturate(180%) blur(var(--mobile-glass-blur));
    padding-top: var(--safe-area-top);
  }
  
  .mobile-navbar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 var(--mobile-inset);
    border-bottom: 0.5px solid var(--mobile-separator);
  }
  
  .mobile-navbar-title {
    font-size: var(--mobile-text-headline);
    font-weight: 600;
    letter-spacing: -0.4px;
    color: var(--mobile-label);
  }
  
  /* iOS 大标题风格 */
  .mobile-large-title {
    padding: 0 var(--mobile-inset) 8px;
    font-size: var(--mobile-text-large-title);
    font-weight: 700;
    letter-spacing: 0.35px;
    color: var(--mobile-label);
    background: var(--mobile-bg-secondary);
  }
}
```

### HTML 示例

```html
<nav class="mobile-navbar">
  <div class="mobile-navbar-inner">
    <button class="back-btn">←</button>
    <h1 class="mobile-navbar-title">标题</h1>
    <button class="action-btn">编辑</button>
  </div>
</nav>
<h1 class="mobile-large-title">大标题</h1>
```

---

## 4. 列表组件

### 分组列表 (iOS Grouped Style)

```css
@media (max-width: 768px) {
  .mobile-list-group {
    background: var(--mobile-bg-secondary);
    border-radius: var(--mobile-radius-card);
    margin: var(--mobile-gap-md) var(--mobile-inset);
    overflow: hidden;
  }
  
  .mobile-list-group-inset {
    margin: var(--mobile-gap-md) var(--mobile-inset-grouped);
  }
  
  .mobile-list-header {
    padding: 6px var(--mobile-inset) 8px;
    font-size: var(--mobile-text-footnote);
    font-weight: 400;
    color: var(--mobile-label-secondary);
    text-transform: uppercase;
    letter-spacing: -0.08px;
    background: transparent;
  }
  
  .mobile-list-footer {
    padding: 8px var(--mobile-inset) 6px;
    font-size: var(--mobile-text-footnote);
    color: var(--mobile-label-secondary);
  }
  
  .mobile-list-item {
    display: flex;
    align-items: center;
    min-height: var(--mobile-touch-min);
    padding: 11px var(--mobile-inset);
    background: var(--mobile-bg-secondary);
    color: var(--mobile-label);
    text-decoration: none;
    position: relative;
    transition: background-color var(--mobile-duration-instant);
  }
  
  .mobile-list-item:active {
    background: var(--mobile-fill-tertiary);
  }
  
  /* 分隔线 - 左侧缩进 */
  .mobile-list-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: var(--mobile-inset);
    right: 0;
    bottom: 0;
    height: 0.5px;
    background: var(--mobile-separator);
  }
  
  /* 无缩进分隔线 */
  .mobile-list-item.separator-full:not(:last-child)::after {
    left: 0;
  }
  
  .mobile-list-item-icon {
    width: 29px;
    height: 29px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex-shrink: 0;
  }
  
  .mobile-list-item-content {
    flex: 1;
    min-width: 0;
  }
  
  .mobile-list-item-title {
    font-size: var(--mobile-text-body);
    font-weight: 400;
    color: var(--mobile-label);
    line-height: 1.29412;
  }
  
  .mobile-list-item-subtitle {
    font-size: var(--mobile-text-footnote);
    color: var(--mobile-label-secondary);
    margin-top: 2px;
  }
  
  .mobile-list-item-value {
    font-size: var(--mobile-text-body);
    color: var(--mobile-label-secondary);
    margin-left: auto;
    padding-left: 8px;
  }
  
  .mobile-list-item-chevron {
    width: 14px;
    height: 14px;
    margin-left: 8px;
    color: var(--mobile-label-quaternary);
    flex-shrink: 0;
  }
  
  .mobile-list-item-chevron::after {
    content: '›';
    font-size: 20px;
    font-weight: 300;
  }
}
```

### HTML 示例

```html
<div class="mobile-list-header">设置</div>
<div class="mobile-list-group">
  <a class="mobile-list-item" href="#">
    <div class="mobile-list-item-icon" style="background: #007AFF;">
      <span>👤</span>
    </div>
    <div class="mobile-list-item-content">
      <div class="mobile-list-item-title">个人资料</div>
      <div class="mobile-list-item-subtitle">编辑头像、昵称</div>
    </div>
    <span class="mobile-list-item-chevron"></span>
  </a>
  <a class="mobile-list-item" href="#">
    <div class="mobile-list-item-icon" style="background: #34C759;">
      <span>🔔</span>
    </div>
    <div class="mobile-list-item-content">
      <div class="mobile-list-item-title">通知设置</div>
    </div>
    <span class="mobile-list-item-value">开启</span>
    <span class="mobile-list-item-chevron"></span>
  </a>
</div>
```

---

## 5. 卡片组件

### 标准卡片

```css
@media (max-width: 768px) {
  .mobile-card {
    background: var(--mobile-bg-secondary);
    border-radius: var(--mobile-radius-card);
    margin: var(--mobile-gap-md) var(--mobile-inset);
    padding: var(--mobile-inset);
    box-shadow: 0 0 0 0.5px var(--mobile-separator);
  }
  
  .mobile-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--mobile-gap-md);
  }
  
  .mobile-card-title {
    font-size: var(--mobile-text-headline);
    font-weight: 600;
    color: var(--mobile-label);
  }
  
  .mobile-card-action {
    font-size: var(--mobile-text-body);
    color: var(--mobile-blue);
    font-weight: 400;
  }
}
```

### 统计卡片

```css
@media (max-width: 768px) {
  .mobile-stat-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    background: var(--mobile-bg-secondary);
    border-radius: var(--mobile-radius-md);
    min-width: 110px;
    flex-shrink: 0;
  }
  
  .mobile-stat-value {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--mobile-label);
    font-variant-numeric: tabular-nums;
  }
  
  .mobile-stat-label {
    font-size: var(--mobile-text-caption1);
    color: var(--mobile-label-secondary);
    letter-spacing: -0.08px;
  }
}
```

---

## 6. 按钮系统

```css
@media (max-width: 768px) {
  .mobile-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--mobile-touch-min);
    padding: 0 20px;
    font-size: var(--mobile-text-body);
    font-weight: 600;
    border-radius: var(--mobile-radius-md);
    border: none;
    cursor: pointer;
    transition: all var(--mobile-duration-fast) var(--mobile-ease-out);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  
  .mobile-btn:active {
    transform: scale(0.97);
    opacity: 0.7;
  }
  
  .mobile-btn-primary {
    background: var(--mobile-blue);
    color: #FFFFFF;
  }
  
  .mobile-btn-secondary {
    background: var(--mobile-fill);
    color: var(--mobile-blue);
  }
  
  .mobile-btn-destructive {
    background: var(--mobile-red);
    color: #FFFFFF;
  }
  
  .mobile-btn-ghost {
    background: transparent;
    color: var(--mobile-blue);
  }
  
  .mobile-btn-block {
    width: 100%;
  }
  
  /* 圆形图标按钮 */
  .mobile-btn-icon {
    width: var(--mobile-touch-min);
    height: var(--mobile-touch-min);
    padding: 0;
    border-radius: 50%;
    background: var(--mobile-fill-secondary);
  }
  
  .mobile-btn-icon:active {
    background: var(--mobile-fill);
  }
}
```

---

## 7. 分段控制器

```css
@media (max-width: 768px) {
  .mobile-segmented {
    display: flex;
    background: var(--mobile-fill-secondary);
    border-radius: var(--mobile-radius-sm);
    padding: 2px;
    gap: 0;
  }
  
  .mobile-segment {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 12px;
    font-size: var(--mobile-text-footnote);
    font-weight: 500;
    color: var(--mobile-label);
    background: transparent;
    border: none;
    border-radius: 6px;
    transition: all var(--mobile-duration-fast) var(--mobile-spring);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  
  .mobile-segment.active {
    background: var(--mobile-bg-secondary);
    box-shadow: 
      0 3px 8px rgba(0, 0, 0, 0.12),
      0 1px 1px rgba(0, 0, 0, 0.04);
  }
  
  [data-theme="dark"] .mobile-segment.active {
    box-shadow: 
      0 3px 8px rgba(0, 0, 0, 0.24),
      0 1px 1px rgba(0, 0, 0, 0.12);
  }
}
```

---

## 8. 搜索栏

```css
@media (max-width: 768px) {
  .mobile-search {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 8px;
    background: var(--mobile-fill-tertiary);
    border-radius: var(--mobile-radius-md);
    margin: 0 var(--mobile-inset) var(--mobile-gap-md);
  }
  
  .mobile-search-icon {
    width: 20px;
    height: 20px;
    margin-right: 6px;
    color: var(--mobile-label-tertiary);
    flex-shrink: 0;
  }
  
  .mobile-search-input {
    flex: 1;
    height: 100%;
    border: none;
    background: transparent;
    font-size: var(--mobile-text-body);
    color: var(--mobile-label);
    outline: none;
  }
  
  .mobile-search-input::placeholder {
    color: var(--mobile-label-tertiary);
  }
  
  .mobile-search-clear {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--mobile-fill);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

---

## 9. 表单元素

### 输入框

```css
@media (max-width: 768px) {
  .mobile-input {
    width: 100%;
    height: var(--mobile-touch-min);
    padding: 0 var(--mobile-inset);
    font-size: var(--mobile-text-body);
    color: var(--mobile-label);
    background: var(--mobile-bg-secondary);
    border: none;
    border-radius: var(--mobile-radius-md);
    outline: none;
    -webkit-appearance: none;
  }
  
  .mobile-input:focus {
    box-shadow: inset 0 0 0 2px var(--mobile-blue);
  }
  
  .mobile-input::placeholder {
    color: var(--mobile-label-tertiary);
  }
}
```

### 文本域

```css
@media (max-width: 768px) {
  .mobile-textarea {
    width: 100%;
    min-height: 100px;
    padding: 12px var(--mobile-inset);
    font-size: var(--mobile-text-body);
    line-height: 1.47059;
    color: var(--mobile-label);
    background: var(--mobile-bg-secondary);
    border: none;
    border-radius: var(--mobile-radius-md);
    outline: none;
    resize: vertical;
    -webkit-appearance: none;
  }
  
  .mobile-textarea:focus {
    box-shadow: inset 0 0 0 2px var(--mobile-blue);
  }
}
```

### Toggle 开关

```css
@media (max-width: 768px) {
  .mobile-toggle {
    width: 51px;
    height: 31px;
    background: var(--mobile-fill);
    border-radius: 15.5px;
    border: none;
    cursor: pointer;
    position: relative;
    transition: background-color var(--mobile-duration-fast) var(--mobile-ease-out);
    -webkit-tap-highlight-color: transparent;
  }
  
  .mobile-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 27px;
    height: 27px;
    background: #FFFFFF;
    border-radius: 50%;
    box-shadow: 
      0 3px 8px rgba(0, 0, 0, 0.15),
      0 1px 1px rgba(0, 0, 0, 0.06);
    transition: transform var(--mobile-duration-fast) var(--mobile-spring);
  }
  
  .mobile-toggle.active {
    background: var(--mobile-green);
  }
  
  .mobile-toggle.active::after {
    transform: translateX(20px);
  }
}
```

### 选择器

```css
@media (max-width: 768px) {
  .mobile-select {
    width: 100%;
    height: var(--mobile-touch-min);
    padding: 0 40px 0 var(--mobile-inset);
    font-size: var(--mobile-text-body);
    color: var(--mobile-label);
    background: var(--mobile-bg-secondary);
    border: none;
    border-radius: var(--mobile-radius-md);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
  }
}
```

---

## 10. 底部操作表

```css
@media (max-width: 768px) {
  .mobile-action-sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 200;
    animation: fadeIn var(--mobile-duration-fast) var(--mobile-ease-out);
  }
  
  .mobile-action-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 201;
    padding: 0 8px calc(8px + var(--safe-area-bottom));
    animation: slideUp var(--mobile-duration-normal) var(--mobile-spring);
  }
  
  .mobile-action-sheet-group {
    background: var(--mobile-glass-bg);
    backdrop-filter: saturate(180%) blur(var(--mobile-glass-blur));
    -webkit-backdrop-filter: saturate(180%) blur(var(--mobile-glass-blur));
    border-radius: var(--mobile-radius-card);
    overflow: hidden;
    margin-bottom: 8px;
  }
  
  .mobile-action-sheet-title {
    padding: 14px var(--mobile-inset);
    font-size: var(--mobile-text-footnote);
    color: var(--mobile-label-secondary);
    text-align: center;
    border-bottom: 0.5px solid var(--mobile-separator);
  }
  
  .mobile-action-sheet-btn {
    width: 100%;
    min-height: 57px;
    padding: 0 var(--mobile-inset);
    font-size: 20px;
    font-weight: 400;
    color: var(--mobile-blue);
    background: transparent;
    border: none;
    border-bottom: 0.5px solid var(--mobile-separator);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background-color var(--mobile-duration-instant);
  }
  
  .mobile-action-sheet-btn:last-child {
    border-bottom: none;
  }
  
  .mobile-action-sheet-btn:active {
    background: var(--mobile-fill-tertiary);
  }
  
  .mobile-action-sheet-btn.destructive {
    color: var(--mobile-red);
  }
  
  .mobile-action-sheet-cancel {
    font-weight: 600;
  }
  
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

---

## 11. Toast 通知

```css
@media (max-width: 768px) {
  .mobile-toast {
    position: fixed;
    top: calc(var(--safe-area-top) + 16px);
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 24px;
    background: var(--mobile-bg-secondary);
    border-radius: var(--mobile-radius-lg);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.08);
    z-index: 1000;
    animation: toastIn var(--mobile-duration-normal) var(--mobile-spring);
  }
  
  .mobile-toast-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .mobile-toast-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  .mobile-toast-message {
    font-size: var(--mobile-text-subhead);
    font-weight: 500;
    color: var(--mobile-label);
  }
  
  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }
}
```

---

## 12. 骨架屏加载

```css
@media (max-width: 768px) {
  .mobile-skeleton {
    background: linear-gradient(
      90deg,
      var(--mobile-fill-tertiary) 0%,
      var(--mobile-fill-secondary) 50%,
      var(--mobile-fill-tertiary) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
  
  .mobile-skeleton-text {
    height: 16px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .mobile-skeleton-text:last-child {
    width: 60%;
    margin-bottom: 0;
  }
  
  .mobile-skeleton-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }
  
  .mobile-skeleton-card {
    height: 80px;
    border-radius: var(--mobile-radius-card);
    margin-bottom: var(--mobile-gap-md);
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
}
```

---

## 13. 徽章与标签

### 徽章

```css
@media (max-width: 768px) {
  .mobile-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: var(--mobile-text-caption2);
    font-weight: 600;
    color: #FFFFFF;
    background: var(--mobile-red);
    border-radius: 10px;
    font-variant-numeric: tabular-nums;
  }
  
  .mobile-badge-dot {
    width: 8px;
    height: 8px;
    min-width: 8px;
    padding: 0;
    border-radius: 50%;
  }
  
  .mobile-badge-blue { background: var(--mobile-blue); }
  .mobile-badge-green { background: var(--mobile-green); }
  .mobile-badge-orange { background: var(--mobile-orange); }
}
```

### 标签

```css
@media (max-width: 768px) {
  .mobile-tag {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    font-size: var(--mobile-text-caption1);
    font-weight: 500;
    border-radius: 13px;
    background: var(--mobile-fill-tertiary);
    color: var(--mobile-label);
  }
  
  .mobile-tag-blue {
    background: rgba(0, 122, 255, 0.12);
    color: var(--mobile-blue);
  }
  
  .mobile-tag-green {
    background: rgba(52, 199, 89, 0.12);
    color: var(--mobile-green);
  }
  
  .mobile-tag-orange {
    background: rgba(255, 149, 0, 0.12);
    color: var(--mobile-orange);
  }
  
  .mobile-tag-red {
    background: rgba(255, 59, 48, 0.12);
    color: var(--mobile-red);
  }
  
  .mobile-tag-purple {
    background: rgba(175, 82, 222, 0.12);
    color: var(--mobile-purple);
  }
}
```

---

## 14. 进度环

```css
@media (max-width: 768px) {
  .mobile-progress-ring {
    width: 44px;
    height: 44px;
    position: relative;
  }
  
  .mobile-progress-ring svg {
    transform: rotate(-90deg);
  }
  
  .mobile-progress-ring-bg {
    stroke: var(--mobile-fill-tertiary);
    fill: none;
    stroke-width: 4;
  }
  
  .mobile-progress-ring-progress {
    stroke: var(--mobile-blue);
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset var(--mobile-duration-slow) var(--mobile-ease-out);
  }
  
  .mobile-progress-ring-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--mobile-text-caption1);
    font-weight: 600;
    color: var(--mobile-label);
  }
}
```

---

## 15. 空状态

```css
@media (max-width: 768px) {
  .mobile-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px var(--mobile-inset-grouped);
    text-align: center;
  }
  
  .mobile-empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.4;
  }
  
  .mobile-empty-title {
    font-size: var(--mobile-text-title3);
    font-weight: 600;
    color: var(--mobile-label);
    margin-bottom: 8px;
  }
  
  .mobile-empty-description {
    font-size: var(--mobile-text-subhead);
    color: var(--mobile-label-secondary);
    max-width: 280px;
    line-height: 1.4;
    margin-bottom: 24px;
  }
}
```

---

## 16. 触控反馈

```css
@media (max-width: 768px) {
  .mobile-pressable {
    transition: transform var(--mobile-duration-instant) var(--mobile-ease-out),
                opacity var(--mobile-duration-instant) var(--mobile-ease-out);
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
  
  .mobile-pressable:active {
    transform: scale(0.98);
    opacity: 0.7;
  }
  
  .mobile-pressable-deep:active {
    transform: scale(0.95);
  }
  
  /* 涟漪效果 */
  .mobile-ripple {
    position: relative;
    overflow: hidden;
  }
  
  .mobile-ripple::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at var(--ripple-x, 50%) var(--ripple-y, 50%), 
      var(--mobile-fill) 0%, 
      transparent 70%
    );
    opacity: 0;
    transform: scale(0);
    transition: transform 0.4s, opacity 0.4s;
  }
  
  .mobile-ripple:active::after {
    opacity: 1;
    transform: scale(2);
    transition: transform 0s, opacity 0s;
  }
}
```

---

## 17. 辅助类

```css
@media (max-width: 768px) {
  /* 安全区域 padding */
  .safe-area-top { padding-top: var(--safe-area-top); }
  .safe-area-bottom { padding-bottom: var(--safe-area-bottom); }
  .safe-area-all {
    padding-top: var(--safe-area-top);
    padding-bottom: var(--safe-area-bottom);
    padding-left: var(--safe-area-left);
    padding-right: var(--safe-area-right);
  }
  
  /* 隐藏桌面端内容 */
  .desktop-only { display: none !important; }
  
  /* 文字截断 */
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .mobile-line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .mobile-line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* 触控区域扩展 */
  .mobile-touch-target {
    position: relative;
  }
  
  .mobile-touch-target::before {
    content: '';
    position: absolute;
    inset: -8px;
  }
  
  /* 禁用选中 */
  .mobile-no-select {
    user-select: none;
    -webkit-user-select: none;
  }
}
```

---

## 18. 底部导航栏

```css
@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 49px;
    background: var(--mobile-glass-bg);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-top: 0.5px solid var(--mobile-separator);
    padding-bottom: env(safe-area-inset-bottom, 0);
    z-index: 1000;
    justify-content: space-around;
    align-items: center;
  }

  [data-theme="dark"] .mobile-nav {
    background: rgba(30, 30, 30, 0.72);
    border-top-color: rgba(84, 84, 88, 0.65);
  }

  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    flex: 1;
    height: 100%;
    max-width: 80px;
    padding: 4px 0 2px;
    border: none;
    background: transparent;
    color: var(--mobile-label-secondary);
    text-decoration: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.1s ease-out, transform 0.1s ease-out;
  }

  .mobile-nav-item:active {
    transform: scale(0.9);
    opacity: 0.5;
  }

  .mobile-nav-item.active {
    color: var(--mobile-blue);
  }

  .mobile-nav-icon {
    font-size: 24px;
    line-height: 1;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-nav-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: -0.24px;
    line-height: 1.2;
  }
}
```

### 更多菜单 (Action Sheet 风格)

```css
@media (max-width: 768px) {
  .mobile-menu-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2000;
    animation: overlayFadeIn 0.2s ease-out;
  }

  .mobile-menu {
    position: fixed;
    bottom: 0;
    left: 8px;
    right: 8px;
    background: var(--mobile-glass-bg);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-radius: 14px;
    padding: 0;
    margin-bottom: calc(8px + env(safe-area-inset-bottom, 0));
    z-index: 2001;
    animation: menuSlideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow: hidden;
    box-shadow: 
      0 0 0 0.5px rgba(0, 0, 0, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.12);
  }

  /* 顶部拖拽指示条 */
  .mobile-menu::before {
    content: '';
    display: block;
    width: 36px;
    height: 5px;
    background: var(--mobile-fill);
    border-radius: 2.5px;
    margin: 6px auto 0;
  }

  .mobile-menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px 8px;
  }

  .mobile-menu-header h3 {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.4px;
    color: var(--mobile-label);
    margin: 0;
  }

  .mobile-menu-items {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 8px 12px 16px;
  }

  .mobile-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px 10px;
    background: transparent;
    border-radius: 10px;
    text-decoration: none;
    color: var(--mobile-label);
    -webkit-tap-highlight-color: transparent;
    transition: background-color 0.1s ease-out, transform 0.1s ease-out;
  }

  .mobile-menu-item:active {
    background: var(--mobile-fill-tertiary);
    transform: scale(0.95);
  }

  .mobile-menu-item.active {
    color: var(--mobile-blue);
  }

  .menu-icon {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    background: var(--mobile-fill-tertiary);
    border-radius: 12px;
  }

  .menu-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: -0.08px;
    text-align: center;
    line-height: 1.27;
    color: inherit;
  }
}
```

---

## 19. 页面组件样式

### 成员任务树页面

```css
@media (max-width: 768px) {
  .members-tree-page {
    padding: 0;
    background: var(--mobile-bg, #f2f2f7);
    height: auto;
    min-height: 100vh;
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0));
  }

  [data-theme="dark"] .members-tree-page {
    background: var(--mobile-bg-dark, #000);
  }

  /* 页面头部 - 大标题风格 */
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px 16px;
    background: var(--mobile-bg, #f2f2f7);
    margin: 0;
    gap: 16px;
    border: none;
  }

  .header-left h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .page-description {
    font-size: 15px;
    color: var(--text-secondary);
    margin: 0;
    display: block;
  }

  /* 选择器容器 */
  .header-controls {
    width: 100%;
    flex-direction: row;
    gap: 10px;
  }

  .select-control {
    flex: 1;
    height: 44px;
    border-radius: 10px;
    font-size: 16px;
    padding: 0 14px;
    border: none;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  [data-theme="dark"] .select-control {
    background: #1c1c1e;
    color: #fff;
  }

  /* 主布局 */
  .tree-layout {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 0;
  }

  /* 卡片面板 */
  .tree-panel,
  .detail-panel {
    background: #fff;
    border-radius: 12px;
    margin: 8px;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  [data-theme="dark"] .tree-panel,
  [data-theme="dark"] .detail-panel {
    background: #1c1c1e;
  }

  /* 成员节点列表 */
  .member-node {
    padding: 16px;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
    border-radius: 0;
    margin: 0;
  }

  [data-theme="dark"] .member-node {
    border-bottom-color: rgba(84, 84, 88, 0.65);
  }

  .member-avatar {
    width: 44px;
    height: 44px;
  }

  .member-name {
    font-size: 17px;
  }

  .role-tag {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
  }

  .edit-member-btn {
    width: 32px;
    height: 32px;
    opacity: 1;
    background: var(--mobile-fill, rgba(118, 118, 128, 0.12));
    border-radius: 8px;
  }
}
```

### 项目总览页面

```css
@media (max-width: 768px) {
  .projects-tree-page {
    padding: 0;
    background: var(--mobile-bg, #f2f2f7);
    min-height: 100vh;
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0));
  }

  /* 统计卡片 - 横向滚动 */
  .overall-stats {
    display: flex;
    overflow-x: auto;
    gap: 10px;
    padding: 0 16px 16px;
    background: transparent;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .overall-stats::-webkit-scrollbar {
    display: none;
  }

  .stat-card {
    flex: 0 0 auto;
    min-width: 90px;
    padding: 16px;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    text-align: center;
    border: none;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .stat-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    margin-top: 4px;
  }

  /* 项目列表 */
  .projects-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 12px 12px;
  }

  .project-card {
    border-radius: 14px;
    padding: 16px;
    background: #fff;
    border: none;
    margin: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .project-card:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  .project-name {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }

  /* 进度条 */
  .progress-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--mobile-fill, rgba(118, 118, 128, 0.12));
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--mobile-blue, #007aff);
  }

  /* 成员区域 */
  .member-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--mobile-fill, rgba(118, 118, 128, 0.12));
    border-radius: 10px;
  }

  .member-avatar-sm {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--mobile-blue, #007aff);
    color: #fff;
  }
}
```

### 成员编辑模态框

```css
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal-container {
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
    border-radius: 14px 14px 0 0;
    animation: slideUpFromBottom 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @keyframes slideUpFromBottom {
    from {
      transform: translateY(100%);
      opacity: 0.5;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    padding: 16px 20px;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
  }

  .modal-header h2 {
    font-size: 17px;
    font-weight: 600;
    text-align: center;
    flex: 1;
  }

  .close-btn {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--mobile-fill, rgba(118, 118, 128, 0.12));
  }

  .modal-body {
    padding: 20px;
    max-height: calc(90vh - 60px - 80px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* 负责人切换卡片 */
  .leader-card {
    padding: 16px;
    border-radius: 12px;
    background: #fff;
    border: 2px solid var(--border-default);
    transition: all 0.2s ease;
  }

  .leader-card.active {
    border-color: var(--mobile-gold, #ffcc00);
    background: linear-gradient(
      135deg, 
      rgba(255, 204, 0, 0.1) 0%, 
      rgba(255, 179, 0, 0.05) 100%
    );
  }

  .leader-card-checkbox {
    width: 26px;
    height: 26px;
    border-radius: 50%;
  }

  .leader-card.active .leader-card-checkbox {
    background: var(--mobile-gold, #ffcc00);
    border-color: var(--mobile-gold, #ffcc00);
  }

  /* 文本域 */
  .form-group textarea {
    min-height: 120px;
    font-size: 16px;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid var(--border-default);
    background: #fff;
    -webkit-appearance: none;
  }

  .form-group textarea:focus {
    border-color: var(--mobile-blue, #007aff);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }

  /* 操作按钮 */
  .modal-actions {
    padding: 16px 20px;
    gap: 12px;
    border-top: 0.5px solid rgba(60, 60, 67, 0.12);
    background: var(--bg-surface);
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  }

  .btn-secondary,
  .btn-primary {
    flex: 1;
    height: 50px;
    border-radius: 12px;
    font-size: 17px;
    font-weight: 600;
  }

  .btn-secondary {
    background: var(--mobile-fill, rgba(118, 118, 128, 0.12));
    border: none;
  }

  .btn-primary {
    background: var(--mobile-blue, #007aff);
  }
}
```

---

## 20. 小屏适配

### iPhone SE / Mini (375px 以下)

```css
@media (max-width: 375px) {
  :root {
    --mobile-inset: 12px;
    --mobile-text-body: 16px;
    --mobile-text-large-title: 30px;
  }
  
  .mobile-stat-card {
    min-width: 95px;
    padding: 12px 14px;
  }
  
  .mobile-stat-value {
    font-size: 22px;
  }
  
  .mobile-nav {
    height: 48px;
  }

  .mobile-nav-icon {
    font-size: 22px;
    height: 22px;
  }

  .mobile-nav-label {
    font-size: 9px;
  }

  .mobile-menu {
    left: 6px;
    right: 6px;
    margin-bottom: calc(6px + env(safe-area-inset-bottom, 0));
  }

  .mobile-menu-header h3 {
    font-size: 16px;
  }

  .mobile-menu-items {
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    padding: 6px 8px 12px;
  }

  .mobile-menu-item {
    padding: 10px 4px 8px;
    gap: 4px;
  }

  .menu-icon {
    width: 44px;
    height: 44px;
    font-size: 22px;
    border-radius: 10px;
  }

  .menu-label {
    font-size: 10px;
  }
}
```

### 超小屏 (320px 以下)

```css
@media (max-width: 320px) {
  .mobile-menu-items {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 文件列表

移动端 UI 相关的 CSS 文件：

| 文件路径 | 说明 |
|---------|------|
| `frontend/src/styles/mobile.css` | 核心移动端设计系统 |
| `frontend/src/components/MobileNav.css` | 底部导航栏组件 |
| `frontend/src/pages/admin/MembersTree.css` | 成员任务树页面 |
| `frontend/src/pages/admin/ProjectsTree.css` | 项目总览页面 |
| `frontend/src/components/tree/MemberEditModal.css` | 成员编辑模态框 |

---

## 使用指南

### 1. 引入设计系统

```css
/* 在主样式文件中引入 */
@import './styles/mobile.css';
@import './components/MobileNav.css';
```

### 2. 使用组件类

```html
<!-- 标准列表 -->
<div class="mobile-list-group">
  <a class="mobile-list-item" href="#">
    <div class="mobile-list-item-content">
      <div class="mobile-list-item-title">列表项</div>
    </div>
    <span class="mobile-list-item-chevron"></span>
  </a>
</div>

<!-- 主按钮 -->
<button class="mobile-btn mobile-btn-primary mobile-btn-block">
  确认
</button>

<!-- 统计卡片 -->
<div class="mobile-stat-card">
  <span class="mobile-stat-value">42</span>
  <span class="mobile-stat-label">任务数</span>
</div>
```

### 3. 响应式断点

- `768px` - 平板/移动端切换点
- `375px` - 小屏手机适配
- `320px` - 超小屏适配

---

*文档版本: 1.0.0*  
*最后更新: 2025-12-19*

