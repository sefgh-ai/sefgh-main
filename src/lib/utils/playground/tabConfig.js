import { Activity, Key, Settings, LineChart, TestTube } from 'lucide-react'
import ApiKeysTab from '@/components/playground/ApiKeysTab'
import UsageTab from '@/components/playground/UsageTab'
import LimitsTab from '@/components/playground/LimitsTab'
import MonitoringTab from '@/components/playground/MonitoringTab'
import TestingTab from '@/components/playground/TestingTab'

export const playgroundTabs = [
  {
    value: 'keys',
    label: 'API Keys',
    icon: Key,
    component: ApiKeysTab,
  },
  {
    value: 'usage',
    label: 'Usage',
    icon: LineChart,
    component: UsageTab,
  },
  {
    value: 'limits',
    label: 'Limits',
    icon: Settings,
    component: LimitsTab,
  },
  {
    value: 'monitoring',
    label: 'Monitor',
    icon: Activity,
    component: MonitoringTab,
  },
  {
    value: 'testing',
    label: 'Testing',
    icon: TestTube,
    component: TestingTab,
  },
]
