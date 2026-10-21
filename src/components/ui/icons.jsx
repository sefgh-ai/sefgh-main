"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ActivityIcon as _huge_ActivityIcon,
  Add01Icon as _huge_Add01Icon,
  AlertCircleIcon as _huge_AlertCircleIcon,
  AlertTriangle as _huge_AlertTriangle,
  ArrowDown01Icon as _huge_ArrowDown01Icon,
  ArrowLeftIcon as _huge_ArrowLeftIcon,
  ArrowRightIcon as _huge_ArrowRightIcon,
  ArrowUp01Icon as _huge_ArrowUp01Icon,
  ArrowUpRight01Icon as _huge_ArrowUpRight01Icon,
  AtSignIcon as _huge_AtSignIcon,
  AwardIcon as _huge_AwardIcon,
  BarChartIcon as _huge_BarChartIcon,
  BeakerIcon as _huge_BeakerIcon,
  BellIcon as _huge_BellIcon,
  BellOffIcon as _huge_BellOffIcon,
  BookIcon as _huge_BookIcon,
  BookOpenIcon as _huge_BookOpenIcon,
  BookmarkCheckIcon as _huge_BookmarkCheckIcon,
  BookmarkIcon as _huge_BookmarkIcon,
  BoxIcon as _huge_BoxIcon,
  BoxesIcon as _huge_BoxesIcon,
  BrainIcon as _huge_BrainIcon,
  BriefcaseIcon as _huge_BriefcaseIcon,
  BugIcon as _huge_BugIcon,
  Building2 as _huge_Building2,
  CalendarDaysIcon as _huge_CalendarDaysIcon,
  CalendarIcon as _huge_CalendarIcon,
  CameraIcon as _huge_CameraIcon,
  Cancel01Icon as _huge_Cancel01Icon,
  CheckmarkCircle01Icon as _huge_CheckmarkCircle01Icon,
  CheckmarkCircle02Icon as _huge_CheckmarkCircle02Icon,
  ChevronDownIcon as _huge_ChevronDownIcon,
  ChevronLeftIcon as _huge_ChevronLeftIcon,
  ChevronRightIcon as _huge_ChevronRightIcon,
  ChevronUpIcon as _huge_ChevronUpIcon,
  ChevronsLeftIcon as _huge_ChevronsLeftIcon,
  ChevronsRightIcon as _huge_ChevronsRightIcon,
  CircleIcon as _huge_CircleIcon,
  ClockIcon as _huge_ClockIcon,
  CodeIcon as _huge_CodeIcon,
  CoffeeIcon as _huge_CoffeeIcon,
  CompassIcon as _huge_CompassIcon,
  Copy01Icon as _huge_Copy01Icon,
  CrownIcon as _huge_CrownIcon,
  DatabaseIcon as _huge_DatabaseIcon,
  Delete01Icon as _huge_Delete01Icon,
  Delete02Icon as _huge_Delete02Icon,
  DollarSignIcon as _huge_DollarSignIcon,
  DownloadIcon as _huge_DownloadIcon,
  Edit02Icon as _huge_Edit02Icon,
  EyeIcon as _huge_EyeIcon,
  EyeOffIcon as _huge_EyeOffIcon,
  FacebookIcon as _huge_FacebookIcon,
  FileCodeIcon as _huge_FileCodeIcon,
  FileDownIcon as _huge_FileDownIcon,
  FilePenLineIcon as _huge_FilePenLineIcon,
  FileQuestionMarkIcon as _huge_FileQuestionMarkIcon,
  FileTextIcon as _huge_FileTextIcon,
  FileXIcon as _huge_FileXIcon,
  FilterIcon as _huge_FilterIcon,
  FlameIcon as _huge_FlameIcon,
  FlaskConicalIcon as _huge_FlaskConicalIcon,
  GaugeIcon as _huge_GaugeIcon,
  GemIcon as _huge_GemIcon,
  GitBranchIcon as _huge_GitBranchIcon,
  GitCommitIcon as _huge_GitCommitIcon,
  GitForkIcon as _huge_GitForkIcon,
  GitPullRequestIcon as _huge_GitPullRequestIcon,
  GithubIcon as _huge_GithubIcon,
  GlobeIcon as _huge_GlobeIcon,
  GraduationCapIcon as _huge_GraduationCapIcon,
  GripVerticalIcon as _huge_GripVerticalIcon,
  HeadphonesIcon as _huge_HeadphonesIcon,
  HeartHandshakeIcon as _huge_HeartHandshakeIcon,
  HeartIcon as _huge_HeartIcon,
  HelpCircleIcon as _huge_HelpCircleIcon,
  HistoryIcon as _huge_HistoryIcon,
  HomeIcon as _huge_HomeIcon,
  InboxIcon as _huge_InboxIcon,
  InformationCircleIcon as _huge_InformationCircleIcon,
  InstagramIcon as _huge_InstagramIcon,
  KeyIcon as _huge_KeyIcon,
  KeyRoundIcon as _huge_KeyRoundIcon,
  KeyboardIcon as _huge_KeyboardIcon,
  LanguagesIcon as _huge_LanguagesIcon,
  LayersIcon as _huge_LayersIcon,
  LayoutGridIcon as _huge_LayoutGridIcon,
  LayoutTable01Icon as _huge_LayoutTable01Icon,
  LayoutTable02Icon as _huge_LayoutTable02Icon,
  LifeBuoy as _huge_LifeBuoy,
  LightbulbIcon as _huge_LightbulbIcon,
  LineChart as _huge_LineChart,
  Link2 as _huge_Link2,
  LinkIcon as _huge_LinkIcon,
  LinkSquare01Icon as _huge_LinkSquare01Icon,
  LinkedinIcon as _huge_LinkedinIcon,
  ListIcon as _huge_ListIcon,
  Loading01Icon as _huge_Loading01Icon,
  LockIcon as _huge_LockIcon,
  LogOutIcon as _huge_LogOutIcon,
  Logout01Icon as _huge_Logout01Icon,
  MailIcon as _huge_MailIcon,
  MapPinIcon as _huge_MapPinIcon,
  Maximize01Icon as _huge_Maximize01Icon,
  MegaphoneIcon as _huge_MegaphoneIcon,
  Menu01Icon as _huge_Menu01Icon,
  MenuIcon as _huge_MenuIcon,
  MessageCircleIcon as _huge_MessageCircleIcon,
  MessageSquareIcon as _huge_MessageSquareIcon,
  MicIcon as _huge_MicIcon,
  MicOffIcon as _huge_MicOffIcon,
  MonitorIcon as _huge_MonitorIcon,
  MoonIcon as _huge_MoonIcon,
  MoreHorizontalIcon as _huge_MoreHorizontalIcon,
  MoreVerticalIcon as _huge_MoreVerticalIcon,
  NoteEditIcon as _huge_NoteEditIcon,
  PaintbrushIcon as _huge_PaintbrushIcon,
  PaletteIcon as _huge_PaletteIcon,
  PaperclipIcon as _huge_PaperclipIcon,
  PinIcon as _huge_PinIcon,
  PlayIcon as _huge_PlayIcon,
  PresentationBarChart01Icon as _huge_PresentationBarChart01Icon,
  QrCodeIcon as _huge_QrCodeIcon,
  RefreshIcon as _huge_RefreshIcon,
  ReplyIcon as _huge_ReplyIcon,
  RocketIcon as _huge_RocketIcon,
  RssIcon as _huge_RssIcon,
  SaveIcon as _huge_SaveIcon,
  ScaleIcon as _huge_ScaleIcon,
  Search01Icon as _huge_Search01Icon,
  SearchCheckIcon as _huge_SearchCheckIcon,
  SearchIcon as _huge_SearchIcon,
  SendIcon as _huge_SendIcon,
  ServerIcon as _huge_ServerIcon,
  Settings01Icon as _huge_Settings01Icon,
  SettingsIcon as _huge_SettingsIcon,
  Share2 as _huge_Share2,
  ShieldCheckIcon as _huge_ShieldCheckIcon,
  ShieldIcon as _huge_ShieldIcon,
  SlidersHorizontalIcon as _huge_SlidersHorizontalIcon,
  SmartphoneIcon as _huge_SmartphoneIcon,
  SortByUp01Icon as _huge_SortByUp01Icon,
  SourceCodeSquareIcon as _huge_SourceCodeSquareIcon,
  SparklesIcon as _huge_SparklesIcon,
  StarIcon as _huge_StarIcon,
  SunIcon as _huge_SunIcon,
  TabletIcon as _huge_TabletIcon,
  TargetIcon as _huge_TargetIcon,
  TelescopeIcon as _huge_TelescopeIcon,
  TestTubeIcon as _huge_TestTubeIcon,
  ThumbsUpIcon as _huge_ThumbsUpIcon,
  Tick02Icon as _huge_Tick02Icon,
  TickDouble02Icon as _huge_TickDouble02Icon,
  TrendingDownIcon as _huge_TrendingDownIcon,
  TrendingUpIcon as _huge_TrendingUpIcon,
  TwitterIcon as _huge_TwitterIcon,
  UploadIcon as _huge_UploadIcon,
  UserIcon as _huge_UserIcon,
  UsersIcon as _huge_UsersIcon,
  WifiIcon as _huge_WifiIcon,
  YoutubeIcon as _huge_YoutubeIcon,
  ZapIcon as _huge_ZapIcon,
} from "@hugeicons/core-free-icons";

/**
 * Higher-order component wrapping Hugeicons into Lucide/Heroicon compatible React forwardRef components.
 */
export function createIcon(iconDef, defaultStrokeWidth = 2) {
  const IconComponent = React.forwardRef(function IconComponent(
    { strokeWidth = defaultStrokeWidth, className, ...props },
    ref
  ) {
    return (
      <HugeiconsIcon
        ref={ref}
        icon={iconDef}
        strokeWidth={strokeWidth}
        className={className}
        {...props}
      />
    );
  });
  IconComponent.displayName = (iconDef && iconDef.name) || "HugeIcon";
  return IconComponent;
}

export { HugeiconsIcon, HugeiconsIcon as HugeIcon, HugeiconsIcon as Icon };

// -------------------------------------------------------------
// Lucide-compatible icon exports
// -------------------------------------------------------------
export const Activity = createIcon(_huge_ActivityIcon);
export const AlertCircle = createIcon(_huge_AlertCircleIcon);
export const AlertTriangle = createIcon(_huge_AlertTriangle);
export const ArrowBigDown = createIcon(_huge_ArrowDown01Icon);
export const ArrowBigUp = createIcon(_huge_ArrowUp01Icon);
export const ArrowLeft = createIcon(_huge_ArrowLeftIcon);
export const ArrowRight = createIcon(_huge_ArrowRightIcon);
export const ArrowUpRight = createIcon(_huge_ArrowUpRight01Icon);
export const AtSign = createIcon(_huge_AtSignIcon);
export const Award = createIcon(_huge_AwardIcon);
export const BarChart3 = createIcon(_huge_BarChartIcon);
export const Beaker = createIcon(_huge_BeakerIcon);
export const Bell = createIcon(_huge_BellIcon);
export const BellOff = createIcon(_huge_BellOffIcon);
export const Book = createIcon(_huge_BookIcon);
export const Bookmark = createIcon(_huge_BookmarkIcon);
export const BookmarkCheck = createIcon(_huge_BookmarkCheckIcon);
export const BookOpen = createIcon(_huge_BookOpenIcon);
export const Box = createIcon(_huge_BoxIcon);
export const Boxes = createIcon(_huge_BoxesIcon);
export const Brain = createIcon(_huge_BrainIcon);
export const Briefcase = createIcon(_huge_BriefcaseIcon);
export const Bug = createIcon(_huge_BugIcon);
export const Building2 = createIcon(_huge_Building2);
export const Calendar = createIcon(_huge_CalendarIcon);
export const CalendarDays = createIcon(_huge_CalendarDaysIcon);
export const Camera = createIcon(_huge_CameraIcon);
export const ChartNoAxesCombined = createIcon(_huge_PresentationBarChart01Icon);
export const Check = createIcon(_huge_Tick02Icon);
export const CheckCheck = createIcon(_huge_TickDouble02Icon);
export const CheckCircle = createIcon(_huge_CheckmarkCircle02Icon);
export const CheckCircle2 = createIcon(_huge_CheckmarkCircle01Icon);
export const ChevronDown = createIcon(_huge_ChevronDownIcon);
export const ChevronLeft = createIcon(_huge_ChevronLeftIcon);
export const ChevronRight = createIcon(_huge_ChevronRightIcon);
export const ChevronsLeft = createIcon(_huge_ChevronsLeftIcon);
export const ChevronsRight = createIcon(_huge_ChevronsRightIcon);
export const ChevronUp = createIcon(_huge_ChevronUpIcon);
export const Circle = createIcon(_huge_CircleIcon);
export const Clock = createIcon(_huge_ClockIcon);
export const Code = createIcon(_huge_CodeIcon);
export const Code2 = createIcon(_huge_SourceCodeSquareIcon);
export const Coffee = createIcon(_huge_CoffeeIcon);
export const Compass = createIcon(_huge_CompassIcon);
export const Copy = createIcon(_huge_Copy01Icon);
export const Crown = createIcon(_huge_CrownIcon);
export const Database = createIcon(_huge_DatabaseIcon);
export const DollarSign = createIcon(_huge_DollarSignIcon);
export const Download = createIcon(_huge_DownloadIcon);
export const Edit2 = createIcon(_huge_Edit02Icon);
export const ExternalLink = createIcon(_huge_LinkSquare01Icon);
export const Eye = createIcon(_huge_EyeIcon);
export const EyeOff = createIcon(_huge_EyeOffIcon);
export const Facebook = createIcon(_huge_FacebookIcon);
export const FileDown = createIcon(_huge_FileDownIcon);
export const FileJson = createIcon(_huge_FileCodeIcon);
export const FileQuestion = createIcon(_huge_FileQuestionMarkIcon);
export const FileText = createIcon(_huge_FileTextIcon);
export const FileX = createIcon(_huge_FileXIcon);
export const Filter = createIcon(_huge_FilterIcon);
export const Flame = createIcon(_huge_FlameIcon);
export const FlaskConical = createIcon(_huge_FlaskConicalIcon);
export const Gauge = createIcon(_huge_GaugeIcon);
export const Gem = createIcon(_huge_GemIcon);
export const GitBranch = createIcon(_huge_GitBranchIcon);
export const GitCommit = createIcon(_huge_GitCommitIcon);
export const GitFork = createIcon(_huge_GitForkIcon);
export const Github = createIcon(_huge_GithubIcon);
export const GitPullRequest = createIcon(_huge_GitPullRequestIcon);
export const Globe = createIcon(_huge_GlobeIcon);
export const GraduationCap = createIcon(_huge_GraduationCapIcon);
export const Grid2X2Plus = createIcon(_huge_LayoutTable01Icon);
export const GripVertical = createIcon(_huge_GripVerticalIcon);
export const Headphones = createIcon(_huge_HeadphonesIcon);
export const Heart = createIcon(_huge_HeartIcon);
export const HeartHandshake = createIcon(_huge_HeartHandshakeIcon);
export const HelpCircle = createIcon(_huge_HelpCircleIcon);
export const History = createIcon(_huge_HistoryIcon);
export const Home = createIcon(_huge_HomeIcon);
export const Inbox = createIcon(_huge_InboxIcon);
export const Info = createIcon(_huge_InformationCircleIcon);
export const Instagram = createIcon(_huge_InstagramIcon);
export const Key = createIcon(_huge_KeyIcon);
export const Keyboard = createIcon(_huge_KeyboardIcon);
export const KeyRound = createIcon(_huge_KeyRoundIcon);
export const Languages = createIcon(_huge_LanguagesIcon);
export const Layers = createIcon(_huge_LayersIcon);
export const LayoutGrid = createIcon(_huge_LayoutGridIcon);
export const LifeBuoy = createIcon(_huge_LifeBuoy);
export const Lightbulb = createIcon(_huge_LightbulbIcon);
export const LineChart = createIcon(_huge_LineChart);
export const Link = createIcon(_huge_LinkIcon);
export const Link2 = createIcon(_huge_Link2);
export const Linkedin = createIcon(_huge_LinkedinIcon);
export const List = createIcon(_huge_ListIcon);
export const Loader2 = createIcon(_huge_Loading01Icon);
export const Lock = createIcon(_huge_LockIcon);
export const LogOut = createIcon(_huge_LogOutIcon);
export const Mail = createIcon(_huge_MailIcon);
export const MapPin = createIcon(_huge_MapPinIcon);
export const Maximize2 = createIcon(_huge_Maximize01Icon);
export const Megaphone = createIcon(_huge_MegaphoneIcon);
export const Menu = createIcon(_huge_MenuIcon);
export const MessageCircle = createIcon(_huge_MessageCircleIcon);
export const MessageSquare = createIcon(_huge_MessageSquareIcon);
export const Mic = createIcon(_huge_MicIcon);
export const MicOff = createIcon(_huge_MicOffIcon);
export const Monitor = createIcon(_huge_MonitorIcon);
export const Moon = createIcon(_huge_MoonIcon);
export const MoreHorizontal = createIcon(_huge_MoreHorizontalIcon);
export const MoreVertical = createIcon(_huge_MoreVerticalIcon);
export const Paintbrush = createIcon(_huge_PaintbrushIcon);
export const Palette = createIcon(_huge_PaletteIcon);
export const Paperclip = createIcon(_huge_PaperclipIcon);
export const PenLine = createIcon(_huge_FilePenLineIcon);
export const PenSquare = createIcon(_huge_NoteEditIcon);
export const Pin = createIcon(_huge_PinIcon);
export const Play = createIcon(_huge_PlayIcon);
export const Plus = createIcon(_huge_Add01Icon);
export const QrCode = createIcon(_huge_QrCodeIcon);
export const RefreshCw = createIcon(_huge_RefreshIcon);
export const Reply = createIcon(_huge_ReplyIcon);
export const Rocket = createIcon(_huge_RocketIcon);
export const Rows3 = createIcon(_huge_LayoutTable02Icon);
export const Rss = createIcon(_huge_RssIcon);
export const Save = createIcon(_huge_SaveIcon);
export const Scale = createIcon(_huge_ScaleIcon);
export const Search = createIcon(_huge_SearchIcon);
export const SearchCheck = createIcon(_huge_SearchCheckIcon);
export const Send = createIcon(_huge_SendIcon);
export const Server = createIcon(_huge_ServerIcon);
export const Settings = createIcon(_huge_SettingsIcon);
export const Share2 = createIcon(_huge_Share2);
export const Shield = createIcon(_huge_ShieldIcon);
export const ShieldCheck = createIcon(_huge_ShieldCheckIcon);
export const SlidersHorizontal = createIcon(_huge_SlidersHorizontalIcon);
export const Smartphone = createIcon(_huge_SmartphoneIcon);
export const SortAsc = createIcon(_huge_SortByUp01Icon);
export const Sparkles = createIcon(_huge_SparklesIcon);
export const Star = createIcon(_huge_StarIcon);
export const Sun = createIcon(_huge_SunIcon);
export const Tablet = createIcon(_huge_TabletIcon);
export const Target = createIcon(_huge_TargetIcon);
export const Telescope = createIcon(_huge_TelescopeIcon);
export const TestTube = createIcon(_huge_TestTubeIcon);
export const ThumbsUp = createIcon(_huge_ThumbsUpIcon);
export const Trash = createIcon(_huge_Delete01Icon);
export const Trash2 = createIcon(_huge_Delete02Icon);
export const TrendingDown = createIcon(_huge_TrendingDownIcon);
export const TrendingUp = createIcon(_huge_TrendingUpIcon);
export const Twitter = createIcon(_huge_TwitterIcon);
export const Upload = createIcon(_huge_UploadIcon);
export const User = createIcon(_huge_UserIcon);
export const Users = createIcon(_huge_UsersIcon);
export const Wifi = createIcon(_huge_WifiIcon);
export const X = createIcon(_huge_Cancel01Icon);
export const Youtube = createIcon(_huge_YoutubeIcon);
export const Zap = createIcon(_huge_ZapIcon);

// -------------------------------------------------------------
// Heroicons-compatible icon exports
// -------------------------------------------------------------
export const ArrowPathIcon = createIcon(_huge_RefreshIcon);
export const ArrowRightOnRectangleIcon = createIcon(_huge_Logout01Icon);
export const Bars3Icon = createIcon(_huge_Menu01Icon);
export const ChevronDownIcon = createIcon(_huge_ChevronDownIcon);
export const CodeBracketIcon = createIcon(_huge_CodeIcon);
export const Cog6ToothIcon = createIcon(_huge_Settings01Icon);
export const MagnifyingGlassIcon = createIcon(_huge_Search01Icon);
export const MoonIcon = createIcon(_huge_MoonIcon);
export const SparklesIcon = createIcon(_huge_SparklesIcon);
export const SunIcon = createIcon(_huge_SunIcon);
export const UserIcon = createIcon(_huge_UserIcon);
export const XMarkIcon = createIcon(_huge_Cancel01Icon);

export default createIcon(_huge_HelpCircleIcon);
