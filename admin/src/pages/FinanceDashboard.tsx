import { useState, useCallback } from 'react'
import './FinanceDashboard.css'
import OverviewTab from './finance/OverviewTab'
import TransactionsTab from './finance/TransactionsTab'
import ShardEconomyTab from './finance/ShardEconomyTab'
import MarketplaceTab from './finance/MarketplaceTab'
import DisputeQueueTab from './finance/DisputeQueueTab'
import SubscriptionsTab from './finance/SubscriptionsTab'
import ShopManagementTab from './finance/ShopManagementTab'
import DonationsTab from './finance/DonationsTab'

const TABS = [
  'Overview',
  'Transactions',
  'Shard Economy',
  'Subscriptions',
  'Shop Management',
  'Marketplace',
  'Donations',
  'Dispute Queue',
] as const

type TabName = (typeof TABS)[number]

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<TabName>('Overview')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const switchToTab = useCallback((tab: TabName) => {
    setActiveTab(tab)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'Overview':
        return <OverviewTab key={refreshKey} onSwitchTab={switchToTab} />
      case 'Transactions':
        return <TransactionsTab key={refreshKey} />
      case 'Shard Economy':
        return <ShardEconomyTab key={refreshKey} />
      case 'Subscriptions':
        return <SubscriptionsTab key={refreshKey} />
      case 'Shop Management':
        return <ShopManagementTab key={refreshKey} />
      case 'Marketplace':
        return <MarketplaceTab key={refreshKey} />
      case 'Donations':
        return <DonationsTab key={refreshKey} />
      case 'Dispute Queue':
        return <DisputeQueueTab key={refreshKey} />
      default:
        return null
    }
  }

  return (
    <div className="finance-page">
      <header className="finance-header">
        <div className="finance-header-top">
          <div>
            <h1>Finance Dashboard</h1>
            <p className="finance-subtitle">Revenue, transactions, and shard economy management</p>
          </div>
          <button className="fin-btn fin-btn-secondary" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
        <div className="finance-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`finance-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="finance-tab-content">
        {renderTab()}
      </div>
    </div>
  )
}

