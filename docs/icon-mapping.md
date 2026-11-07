# Icon mapping: Lucide / Heroicons → Phosphor (ICON-001)

Owner decision (2026-11-06): the app uses **Phosphor** (`@phosphor-icons/react`) only. `lucide-react` and `@heroicons/react` are removed.

**Rule: an icon must mean what the control does.** Never use a sparkle/stars icon for chat, a model, a version, a sign-up button or a decorative header. A wand is used only for "enhance/improve text" actions.

## How to import

- Use the `…Icon` export names (the bare names are deprecated in Phosphor 2.1): `import { ChatCircleIcon } from "@phosphor-icons/react";`
- Files **without** `"use client"` (server components, plain config modules) import from `"@phosphor-icons/react/ssr"`.
- Default size differs: Lucide was 24px, Phosphor is `1em`. If an icon has no `size` prop and no `w-*`/`h-*`/`size-*` class, add `size={24}`.
- Filled look: Lucide used `fill-*` classes or `fill="currentColor"` (e.g. a filled star). In Phosphor use `weight="fill"` and colour with `text-*`.
- Spinners (`Loader2`, `ArrowPathIcon` with `animate-spin`) become `CircleNotchIcon` with the same `animate-spin`.

## Default mapping (Lucide)

| Lucide | Phosphor | | Lucide | Phosphor |
|---|---|---|---|---|
| Activity | Pulse | | Lightbulb | Lightbulb |
| AlertCircle | WarningCircle | | LineChart | ChartLine |
| AlertTriangle | Warning | | Link | Link |
| ArrowBigDown / ArrowBigUp | ArrowFatDown / ArrowFatUp | | Link2 | LinkSimple |
| ArrowLeft / ArrowRight / ArrowUpRight | same names | | Linkedin | LinkedinLogo |
| AtSign | At | | List | ListBullets |
| Award | Medal | | Loader2 | CircleNotch |
| BarChart3 | ChartBar | | Lock | Lock |
| Beaker / FlaskConical | Flask | | LogOut | SignOut |
| Bell / BellOff | Bell / BellSlash | | Mail | Envelope |
| Book / BookOpen | Book / BookOpen | | MapPin | MapPin |
| Bookmark | BookmarkSimple | | Maximize2 | ArrowsOut |
| BookmarkCheck | BookmarkSimple + `weight="fill"` | | Megaphone | Megaphone |
| Box | Cube | | Menu | List |
| Boxes | Package | | MessageCircle | ChatCircle |
| Brain / Briefcase / Bug | same names | | MessageSquare | Chat |
| Building2 | Buildings | | Mic / MicOff | Microphone / MicrophoneSlash |
| Calendar | CalendarBlank | | Monitor / Moon | same names |
| CalendarDays | CalendarDots | | MoreHorizontal / MoreVertical | DotsThree / DotsThreeVertical |
| Camera | Camera | | Paintbrush | PaintBrush |
| ChartNoAxesCombined | ChartLineUp | | Palette / Paperclip | same names |
| Check | Check | | PenLine | PencilLine |
| CheckCheck | Checks | | PenSquare | NotePencil |
| CheckCircle / CheckCircle2 | CheckCircle | | Pin | PushPin |
| ChevronDown/Left/Right/Up | CaretDown/Left/Right/Up | | Play / Plus | same names |
| ChevronsLeft / ChevronsRight | CaretDoubleLeft / CaretDoubleRight | | QrCode | QrCode |
| Circle / Clock | same names | | RefreshCw | ArrowsClockwise |
| Code (`< >`) | CodeSimple | | Reply | ArrowBendUpLeft |
| Code2 (`</>`) | Code | | Rocket | RocketLaunch |
| Coffee / Compass / Copy / Crown / Database | same names | | Rows3 | Rows |
| DollarSign | CurrencyDollar | | Rss | Rss |
| Download | DownloadSimple | | Save | FloppyDisk |
| Edit2 | PencilSimple | | Scale | Scales |
| ExternalLink | ArrowSquareOut | | Search / SearchCheck | MagnifyingGlass |
| Eye / EyeOff | Eye / EyeSlash | | Send | PaperPlaneRight |
| Facebook | FacebookLogo | | Server | HardDrives |
| FileDown | FileArrowDown | | Settings | Gear |
| FileJson | FileCode | | Share2 | ShareNetwork |
| FileQuestion | FileMagnifyingGlass | | Shield / SlidersHorizontal | same names |
| FileText / FileX | same names | | Smartphone / Tablet | DeviceMobile / DeviceTablet |
| Filter | Funnel | | SortAsc | SortAscending |
| Flame | Fire | | Star / Sun / Target / TestTube / ThumbsUp | same names |
| Gem | Diamond | | Telescope | Binoculars |
| GitBranch / GitCommit / GitFork / GitPullRequest | same names | | Trash / Trash2 | Trash |
| Github | GithubLogo | | TrendingUp / TrendingDown | TrendUp / TrendDown |
| Globe / GraduationCap / Headphones / Heart / Info / Key / Keyboard | same names | | Twitter | XLogo |
| Grid2X2Plus | SquaresFour | | Upload | UploadSimple |
| GripVertical | DotsSixVertical | | User / Users | same names |
| HeartHandshake | Handshake | | Wifi | WifiHigh |
| HelpCircle | Question | | X | X |
| History | ClockCounterClockwise | | Youtube | YoutubeLogo |
| Home | House | | Zap | Lightning |
| Inbox | Tray | | Languages | Translate |
| Instagram | InstagramLogo | | Layers | Stack |
| KeyRound | Key | | LayoutGrid | SquaresFour |
| LifeBuoy | Lifebuoy | | Sparkles | **never by default, see below** |

## Default mapping (Heroicons)

| Heroicons | Phosphor |
|---|---|
| ArrowPathIcon (spinning) | CircleNotch |
| ArrowRightOnRectangleIcon | SignOut |
| Bars3Icon | List |
| ChevronDownIcon | CaretDown |
| CodeBracketIcon | Code |
| Cog6ToothIcon | Gear |
| MagnifyingGlassIcon | MagnifyingGlass |
| MoonIcon / SunIcon / UserIcon | Moon / Sun / User |
| XMarkIcon | X |
| SparklesIcon | see below |

## Every former Sparkles icon, chosen by what it labels

| File | What it labels | Phosphor |
|---|---|---|
| app/careers/page.js | "High Impact" card | Target |
| app/docs/page.js | "Prefer API examples?" | Code |
| app/news/page.js | release version badge | Tag |
| app/page.js | "Get Started Free" sign-up button | RocketLaunch |
| app/pricing/page.js | Free plan | Plant |
| app/research/page.js | research item card | Flask |
| app/settings/page.js | "Settings" page header | Gear |
| app/versions/page.js | current release (list icon and highlight header) | RocketLaunch |
| components/AnimatedNavbar.jsx | `/chat` "AI Code Assistant" / "AI Chat Assistant" | ChatCircle |
| components/AnimatedNavbar.jsx | "Join Community" (sign-up) | UserPlus |
| components/chat/ChatHeader.jsx | chat title | ChatCircle |
| components/chat/ChatInput.jsx | "Enhance" prompt action | MagicWand |
| components/chat/ChatSidebar.jsx | model picker and SEFGH V1/V2/V3 models | Cpu |
| components/chat/MessageList.jsx | "Welcome to AI Chat" hero | ChatsCircle |
| components/chat/MessageList.jsx | assistant avatar | Robot |
| components/downloads/DownloadHeader.jsx | "Coming Soon" | Hourglass |
| components/home/TopicsNav.jsx | personalised feed of selected topics | Hash |
| components/navigation/DynamicIslandNav.jsx | Chat nav item | ChatCircle |
| components/onboarding/Step*.jsx | "SEFGH AI Assistant" avatar | Robot |
| components/onboarding/StepPreferences.jsx | "You're all set!" | Confetti |
| components/onboarding/StepRole.jsx | Hobbyist role | PuzzlePiece |
| components/PreferencesDialog.jsx | "Add" category button | Plus |
| components/search/QueryUnderstandingPanel.jsx | "We understood your query as" | Brain |
| components/search/SearchBox.jsx | "Enhance query with AI" | MagicWand |
| components/search/SearchNavGuide.jsx | "AI help" (opens chat) | ChatCircle |
| components/search/SearchSidebar.jsx | unused import | remove |
| components/settings/NotificationsTab.jsx | "AI Insights" notifications | Lightbulb |
| components/settings/PersonalizeTab.jsx | "AI Features" section | Brain |
| components/trending/EditorsChoice.jsx | "Editors' Choice" badge | SealCheck |
