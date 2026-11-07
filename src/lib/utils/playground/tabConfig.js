import { PulseIcon, KeyIcon, GaugeIcon, ChartLineIcon, TestTubeIcon } from '@phosphor-icons/react/ssr'
import ApiKeysTab from '@/components/playground/ApiKeysTab'
import UsageTab from '@/components/playground/UsageTab'
import LimitsTab from '@/components/playground/LimitsTab'
import MonitoringTab from '@/components/playground/MonitoringTab'
import TestingTab from '@/components/playground/TestingTab'

export const playgroundTabs = [
  {
    value: 'keys',
    label: 'API Keys',
    icon: KeyIcon,
    component: ApiKeysTab,
  },
  {
    value: 'usage',
    label: 'Usage',
    icon: ChartLineIcon,
    component: UsageTab,
  },
  {
    value: 'limits',
    label: 'Limits',
    icon: GaugeIcon,
    component: LimitsTab,
  },
  {
    value: 'monitoring',
    label: 'Monitor',
    icon: PulseIcon,
    component: MonitoringTab,
  },
  {
    value: 'testing',
    label: 'Testing',
    icon: TestTubeIcon,
    component: TestingTab,
  },
]
