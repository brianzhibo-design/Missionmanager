/**
 * TaskFlow 品牌 Logo 组件
 */
import './Logo.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 14 },
    md: { icon: 32, text: 18 },
    lg: { icon: 48, text: 24 },
  };

  const s = sizes[size];

  return (
    <div className={`logo logo-${size}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-icon"
      >
        {/* 背景圆角矩形 */}
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="8"
          fill="url(#logoGradient)"
        />
        
        {/* 任务勾选图标 */}
        <path
          d="M10 16L14 20L22 12"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* 流动线条 */}
        <path
          d="M8 24C8 24 12 26 16 26C20 26 24 24 24 24"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        <defs>
          <linearGradient
            id="logoGradient"
            x1="2"
            y1="2"
            x2="30"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6366F1" />
            <stop offset="0.5" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <span className="logo-text" style={{ fontSize: s.text }}>
          TaskFlow
        </span>
      )}
    </div>
  );
}

export default Logo;

