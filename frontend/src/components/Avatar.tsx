import './Avatar.css';

interface AvatarProps {
  name: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  src?: string;
  className?: string;
}

const AVATAR_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, size = 'md', src, className = '' }: AvatarProps) {
  const initials = getInitials(name || '?');
  const bgColor = getColorFromName(name || '');

  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        className={`avatar avatar-${size} ${className}`}
      />
    );
  }

  return (
    <div 
      className={`avatar avatar-${size} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      <span className="avatar-initials">{initials}</span>
    </div>
  );
}

export default Avatar;

