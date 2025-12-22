/**
 * 统一导出所有图标 - 使用 Heroicons v2 Outline
 * https://heroicons.com/
 * 
 * 为了兼容 Lucide 的 size 属性，我们使用包装函数
 */
import React, { forwardRef, ComponentType } from 'react';
import type { SVGProps } from 'react';

// 图标包装器 Props 类型
type IconWrapperProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number;
};

// 包装函数：将 size 属性转换为 style
function wrapIcon(Icon: ComponentType<SVGProps<SVGSVGElement>>) {
  const WrappedIcon = forwardRef<SVGSVGElement, IconWrapperProps>(
    ({ size, strokeWidth, className, style, ...props }, ref) => {
      const sizeValue = typeof size === 'number' ? `${size}px` : size;
      const mergedStyle = sizeValue 
        ? { width: sizeValue, height: sizeValue, ...style }
        : style;
      
      return React.createElement(Icon, {
        ref,
        className,
        style: mergedStyle,
        strokeWidth: strokeWidth ?? 1.5,
        ...props,
      } as SVGProps<SVGSVGElement>);
    }
  );
  WrappedIcon.displayName = Icon.displayName || 'WrappedIcon';
  return WrappedIcon;
}

// Heroicons 原始导入
import * as HeroIcons from '@heroicons/react/24/outline';

// 导出包装后的图标

// 导航图标
export const LayoutDashboard = wrapIcon(HeroIcons.Squares2X2Icon);
export const CheckSquare = wrapIcon(HeroIcons.CheckCircleIcon);
export const FolderKanban = wrapIcon(HeroIcons.FolderIcon);
export const Users = wrapIcon(HeroIcons.UserGroupIcon);
export const Network = wrapIcon(HeroIcons.ShareIcon);
export const BarChart3 = wrapIcon(HeroIcons.ChartBarIcon);
export const FileText = wrapIcon(HeroIcons.DocumentTextIcon);
export const Brain = wrapIcon(HeroIcons.SparklesIcon);
export const Settings = wrapIcon(HeroIcons.Cog6ToothIcon);
export const Bell = wrapIcon(HeroIcons.BellIcon);
export const Search = wrapIcon(HeroIcons.MagnifyingGlassIcon);
export const Plus = wrapIcon(HeroIcons.PlusIcon);
export const X = wrapIcon(HeroIcons.XMarkIcon);
export const ChevronDown = wrapIcon(HeroIcons.ChevronDownIcon);
export const ChevronRight = wrapIcon(HeroIcons.ChevronRightIcon);
export const ChevronLeft = wrapIcon(HeroIcons.ChevronLeftIcon);
export const ChevronUp = wrapIcon(HeroIcons.ChevronUpIcon);
export const MoreHorizontal = wrapIcon(HeroIcons.EllipsisHorizontalIcon);
export const MoreVertical = wrapIcon(HeroIcons.EllipsisVerticalIcon);

// 任务相关
export const Circle = wrapIcon(HeroIcons.MinusCircleIcon);
export const CheckCircle2 = wrapIcon(HeroIcons.CheckCircleIcon);
export const Clock = wrapIcon(HeroIcons.ClockIcon);
export const AlertCircle = wrapIcon(HeroIcons.ExclamationCircleIcon);
export const AlertTriangle = wrapIcon(HeroIcons.ExclamationTriangleIcon);
export const Calendar = wrapIcon(HeroIcons.CalendarIcon);
export const CalendarDays = wrapIcon(HeroIcons.CalendarDaysIcon);
export const Flag = wrapIcon(HeroIcons.FlagIcon);
export const Tag = wrapIcon(HeroIcons.TagIcon);

// 操作图标
export const Edit = wrapIcon(HeroIcons.PencilIcon);
export const Pencil = wrapIcon(HeroIcons.PencilIcon);
export const Trash2 = wrapIcon(HeroIcons.TrashIcon);
export const Copy = wrapIcon(HeroIcons.DocumentDuplicateIcon);
export const Download = wrapIcon(HeroIcons.ArrowDownTrayIcon);
export const Upload = wrapIcon(HeroIcons.ArrowUpTrayIcon);
export const Send = wrapIcon(HeroIcons.PaperAirplaneIcon);
export const RefreshCw = wrapIcon(HeroIcons.ArrowPathIcon);
export const RefreshCcw = wrapIcon(HeroIcons.ArrowPathRoundedSquareIcon);
export const Filter = wrapIcon(HeroIcons.FunnelIcon);
export const SortAsc = wrapIcon(HeroIcons.BarsArrowUpIcon);
export const Grid = wrapIcon(HeroIcons.Squares2X2Icon);
export const List = wrapIcon(HeroIcons.Bars3Icon);
export const Kanban = wrapIcon(HeroIcons.ViewColumnsIcon);

// 状态图标
export const Loader2 = wrapIcon(HeroIcons.ArrowPathIcon);
export const Check = wrapIcon(HeroIcons.CheckIcon);
export const Info = wrapIcon(HeroIcons.InformationCircleIcon);
export const HelpCircle = wrapIcon(HeroIcons.QuestionMarkCircleIcon);

// 用户相关
export const User = wrapIcon(HeroIcons.UserIcon);
export const UserPlus = wrapIcon(HeroIcons.UserPlusIcon);
export const UserCircle = wrapIcon(HeroIcons.UserCircleIcon);
export const LogOut = wrapIcon(HeroIcons.ArrowRightStartOnRectangleIcon);

// 主题
export const Sun = wrapIcon(HeroIcons.SunIcon);
export const Moon = wrapIcon(HeroIcons.MoonIcon);
export const Monitor = wrapIcon(HeroIcons.ComputerDesktopIcon);

// 其他常用
export const Sparkles = wrapIcon(HeroIcons.SparklesIcon);
export const Zap = wrapIcon(HeroIcons.BoltIcon);
export const TrendingUp = wrapIcon(HeroIcons.ArrowTrendingUpIcon);
export const TrendingDown = wrapIcon(HeroIcons.ArrowTrendingDownIcon);
export const Target = wrapIcon(HeroIcons.FlagIcon);
export const Lightbulb = wrapIcon(HeroIcons.LightBulbIcon);
export const Mail = wrapIcon(HeroIcons.EnvelopeIcon);
export const MailOpen = wrapIcon(HeroIcons.EnvelopeOpenIcon);
export const ExternalLink = wrapIcon(HeroIcons.ArrowTopRightOnSquareIcon);
export const ArrowLeft = wrapIcon(HeroIcons.ArrowLeftIcon);
export const ArrowRight = wrapIcon(HeroIcons.ArrowRightIcon);
export const ArrowUp = wrapIcon(HeroIcons.ArrowUpIcon);
export const ArrowDown = wrapIcon(HeroIcons.ArrowDownIcon);
export const Home = wrapIcon(HeroIcons.HomeIcon);
export const XCircle = wrapIcon(HeroIcons.XCircleIcon);
export const Play = wrapIcon(HeroIcons.PlayIcon);
export const Pause = wrapIcon(HeroIcons.PauseIcon);
export const Eye = wrapIcon(HeroIcons.EyeIcon);
export const EyeOff = wrapIcon(HeroIcons.EyeSlashIcon);
export const Lock = wrapIcon(HeroIcons.LockClosedIcon);
export const Unlock = wrapIcon(HeroIcons.LockOpenIcon);
export const Link = wrapIcon(HeroIcons.LinkIcon);
export const Link2 = wrapIcon(HeroIcons.LinkIcon);
export const Unlink = wrapIcon(HeroIcons.LinkSlashIcon);
export const Share = wrapIcon(HeroIcons.ShareIcon);
export const Share2 = wrapIcon(HeroIcons.ShareIcon);
export const Archive = wrapIcon(HeroIcons.ArchiveBoxIcon);
export const Inbox = wrapIcon(HeroIcons.InboxIcon);
export const Folder = wrapIcon(HeroIcons.FolderIcon);
export const FolderOpen = wrapIcon(HeroIcons.FolderOpenIcon);
export const FolderPlus = wrapIcon(HeroIcons.FolderPlusIcon);
export const File = wrapIcon(HeroIcons.DocumentIcon);
export const FilePlus = wrapIcon(HeroIcons.DocumentPlusIcon);
export const Image = wrapIcon(HeroIcons.PhotoIcon);
export const Video = wrapIcon(HeroIcons.VideoCameraIcon);
export const Music = wrapIcon(HeroIcons.MusicalNoteIcon);
export const Code = wrapIcon(HeroIcons.CodeBracketIcon);
export const Terminal = wrapIcon(HeroIcons.CommandLineIcon);
export const Database = wrapIcon(HeroIcons.CircleStackIcon);
export const Server = wrapIcon(HeroIcons.ServerIcon);
export const Cloud = wrapIcon(HeroIcons.CloudIcon);
export const CloudUpload = wrapIcon(HeroIcons.CloudArrowUpIcon);
export const CloudDownload = wrapIcon(HeroIcons.CloudArrowDownIcon);
export const Wifi = wrapIcon(HeroIcons.WifiIcon);
export const WifiOff = wrapIcon(HeroIcons.NoSymbolIcon);
export const Power = wrapIcon(HeroIcons.PowerIcon);
export const Volume2 = wrapIcon(HeroIcons.SpeakerWaveIcon);
export const VolumeX = wrapIcon(HeroIcons.SpeakerXMarkIcon);
export const Mic = wrapIcon(HeroIcons.MicrophoneIcon);
export const Camera = wrapIcon(HeroIcons.CameraIcon);
export const Phone = wrapIcon(HeroIcons.PhoneIcon);
export const PhoneOff = wrapIcon(HeroIcons.PhoneXMarkIcon);
export const MessageSquare = wrapIcon(HeroIcons.ChatBubbleLeftRightIcon);
export const MessageCircle = wrapIcon(HeroIcons.ChatBubbleOvalLeftIcon);
export const Comment = wrapIcon(HeroIcons.ChatBubbleLeftIcon);
export const Heart = wrapIcon(HeroIcons.HeartIcon);
export const Star = wrapIcon(HeroIcons.StarIcon);
export const Bookmark = wrapIcon(HeroIcons.BookmarkIcon);
export const ThumbsUp = wrapIcon(HeroIcons.HandThumbUpIcon);
export const ThumbsDown = wrapIcon(HeroIcons.HandThumbDownIcon);
export const Award = wrapIcon(HeroIcons.TrophyIcon);
export const Gift = wrapIcon(HeroIcons.GiftIcon);
export const ShoppingCart = wrapIcon(HeroIcons.ShoppingCartIcon);
export const CreditCard = wrapIcon(HeroIcons.CreditCardIcon);
export const DollarSign = wrapIcon(HeroIcons.CurrencyDollarIcon);
export const PieChart = wrapIcon(HeroIcons.ChartPieIcon);
export const LineChart = wrapIcon(HeroIcons.PresentationChartLineIcon);
export const Activity = wrapIcon(HeroIcons.ChartBarIcon);
export const Timer = wrapIcon(HeroIcons.ClockIcon);
export const Hourglass = wrapIcon(HeroIcons.ClockIcon);
export const Repeat = wrapIcon(HeroIcons.ArrowPathIcon);
export const RotateCw = wrapIcon(HeroIcons.ArrowPathIcon);
export const RotateCcw = wrapIcon(HeroIcons.ArrowPathIcon);
export const Shuffle = wrapIcon(HeroIcons.ArrowsRightLeftIcon);
export const Move = wrapIcon(HeroIcons.ArrowsPointingOutIcon);
export const Maximize = wrapIcon(HeroIcons.ArrowsPointingOutIcon);
export const Maximize2 = wrapIcon(HeroIcons.ArrowsPointingOutIcon);
export const Minimize = wrapIcon(HeroIcons.ArrowsPointingInIcon);
export const Minimize2 = wrapIcon(HeroIcons.ArrowsPointingInIcon);
export const ZoomIn = wrapIcon(HeroIcons.MagnifyingGlassPlusIcon);
export const ZoomOut = wrapIcon(HeroIcons.MagnifyingGlassMinusIcon);
export const Layers = wrapIcon(HeroIcons.RectangleStackIcon);
export const Layout = wrapIcon(HeroIcons.Squares2X2Icon);
export const Columns = wrapIcon(HeroIcons.ViewColumnsIcon);
export const Table = wrapIcon(HeroIcons.TableCellsIcon);
export const Hash = wrapIcon(HeroIcons.HashtagIcon);
export const AtSign = wrapIcon(HeroIcons.AtSymbolIcon);
export const Globe = wrapIcon(HeroIcons.GlobeAltIcon);
export const Map = wrapIcon(HeroIcons.MapIcon);
export const MapPin = wrapIcon(HeroIcons.MapPinIcon);
export const Navigation = wrapIcon(HeroIcons.ArrowUpIcon);
export const Compass = wrapIcon(HeroIcons.ArrowsPointingOutIcon);

// 额外常用图标
export const PlusCircle = wrapIcon(HeroIcons.PlusCircleIcon);
export const MinusCircle = wrapIcon(HeroIcons.MinusCircleIcon);
export const Menu = wrapIcon(HeroIcons.Bars3BottomLeftIcon);
export const Sliders = wrapIcon(HeroIcons.AdjustmentsHorizontalIcon);
export const SlidersHorizontal = wrapIcon(HeroIcons.AdjustmentsVerticalIcon);
export const Cube = wrapIcon(HeroIcons.CubeIcon);
export const Building = wrapIcon(HeroIcons.BuildingOfficeIcon);
export const ClipboardList = wrapIcon(HeroIcons.ClipboardDocumentListIcon);
export const Clipboard = wrapIcon(HeroIcons.ClipboardIcon);
export const ClipboardCheck = wrapIcon(HeroIcons.ClipboardDocumentCheckIcon);
export const Tool = wrapIcon(HeroIcons.WrenchScrewdriverIcon);
export const Wrench = wrapIcon(HeroIcons.WrenchIcon);
export const Cog = wrapIcon(HeroIcons.CogIcon);
export const Paperclip = wrapIcon(HeroIcons.PaperClipIcon);
export const Rocket = wrapIcon(HeroIcons.RocketLaunchIcon);
export const Fire = wrapIcon(HeroIcons.FireIcon);
export const Shield = wrapIcon(HeroIcons.ShieldCheckIcon);
export const ShieldCheck = wrapIcon(HeroIcons.ShieldCheckIcon);
export const ShieldAlert = wrapIcon(HeroIcons.ShieldExclamationIcon);
export const Cpu = wrapIcon(HeroIcons.CpuChipIcon);
export const Signal = wrapIcon(HeroIcons.SignalIcon);
export const BellRing = wrapIcon(HeroIcons.BellAlertIcon);
export const Coffee = wrapIcon(HeroIcons.BeakerIcon);
export const Key = wrapIcon(HeroIcons.KeyIcon);
export const Fingerprint = wrapIcon(HeroIcons.FingerPrintIcon);
export const QrCode = wrapIcon(HeroIcons.QrCodeIcon);
export const BookOpen = wrapIcon(HeroIcons.BookOpenIcon);
export const GraduationCap = wrapIcon(HeroIcons.AcademicCapIcon);
export const Newspaper = wrapIcon(HeroIcons.NewspaperIcon);
export const Printer = wrapIcon(HeroIcons.PrinterIcon);
export const Calculator = wrapIcon(HeroIcons.CalculatorIcon);
export const Palette = wrapIcon(HeroIcons.SwatchIcon);
export const Paintbrush = wrapIcon(HeroIcons.PaintBrushIcon);
export const Scissors = wrapIcon(HeroIcons.ScissorsIcon);
export const Hand = wrapIcon(HeroIcons.HandRaisedIcon);
export const Like = wrapIcon(HeroIcons.HandThumbUpIcon);
export const Languages = wrapIcon(HeroIcons.LanguageIcon);
export const Puzzle = wrapIcon(HeroIcons.PuzzlePieceIcon);
export const ChevronsLeft = wrapIcon(HeroIcons.ChevronDoubleLeftIcon);
export const ChevronsRight = wrapIcon(HeroIcons.ChevronDoubleRightIcon);
export const ChevronsUp = wrapIcon(HeroIcons.ChevronDoubleUpIcon);
export const ChevronsDown = wrapIcon(HeroIcons.ChevronDoubleDownIcon);
export const ArrowUpDown = wrapIcon(HeroIcons.ArrowsUpDownIcon);
export const ListOrdered = wrapIcon(HeroIcons.ListBulletIcon);
export const ListTodo = wrapIcon(HeroIcons.QueueListIcon);
export const AlignLeft = wrapIcon(HeroIcons.Bars3CenterLeftIcon);
export const BadgeCheck = wrapIcon(HeroIcons.CheckBadgeIcon);
export const Square = wrapIcon(HeroIcons.StopIcon);
export const PlayCircle = wrapIcon(HeroIcons.PlayCircleIcon);
export const PauseCircle = wrapIcon(HeroIcons.PauseCircleIcon);
export const FileSearch = wrapIcon(HeroIcons.DocumentMagnifyingGlassIcon);
export const MousePointer = wrapIcon(HeroIcons.CursorArrowRaysIcon);
export const Globe2 = wrapIcon(HeroIcons.GlobeAmericasIcon);
export const Minus = wrapIcon(HeroIcons.MinusIcon);

// 缺失的图标 - 使用最接近的替代
export const History = wrapIcon(HeroIcons.ClockIcon);
export const Wand2 = wrapIcon(HeroIcons.SparklesIcon);
export const Crown = wrapIcon(HeroIcons.StarIcon);
export const Bot = wrapIcon(HeroIcons.CpuChipIcon);
export const Smile = wrapIcon(HeroIcons.FaceSmileIcon);
export const Construction = wrapIcon(HeroIcons.WrenchScrewdriverIcon);
export const Flame = wrapIcon(HeroIcons.FireIcon);
export const Package = wrapIcon(HeroIcons.CubeIcon);
export const Save = wrapIcon(HeroIcons.ArrowDownTrayIcon);
export const CheckCircle = wrapIcon(HeroIcons.CheckCircleIcon);
export const Edit2 = wrapIcon(HeroIcons.PencilIcon);
export const Building2 = wrapIcon(HeroIcons.BuildingOfficeIcon);
export const Scale = wrapIcon(HeroIcons.ScaleIcon);
export const PaintBucket = wrapIcon(HeroIcons.PaintBrushIcon);
export const Megaphone = wrapIcon(HeroIcons.MegaphoneIcon);
export const Wallet = wrapIcon(HeroIcons.WalletIcon);
export const Handshake = wrapIcon(HeroIcons.HandRaisedIcon);
export const BellOff = wrapIcon(HeroIcons.BellSlashIcon);
export const Briefcase = wrapIcon(HeroIcons.BriefcaseIcon);
export const GitBranch = wrapIcon(HeroIcons.ArrowsRightLeftIcon);
export const UserMinus = wrapIcon(HeroIcons.UserMinusIcon);
export const LayoutGrid = wrapIcon(HeroIcons.Squares2X2Icon);
export const CalendarRange = wrapIcon(HeroIcons.CalendarDaysIcon);
export const CircleDot = wrapIcon(HeroIcons.StopCircleIcon);

// Heroicons 组件类型
export type HeroIcon = ReturnType<typeof wrapIcon>;

// 为了兼容 LucideIcon 类型
export type LucideIcon = HeroIcon;
