import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import './BazaarSell.css';

interface TradeRecord {
  id: number;
  item_name: string;
  item_rarity: string;
  price_shards: number;
  tax_shards: number | null;
  trade_type: 'sale' | 'purchase';
  counterparty_alias: string | null;
  completed_at: string;
}

const RARITY_CLASS: Record<string, string> = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
  cosmic: 'rarity-cosmic',
};

type FilterType = 'all' | 'sales' | 'purchases';

const TradeHistory: React.FC = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const typeParam = filter === 'all' ? '' : `&type=${filter}`;
      const res = await api.get(`/api/marketplace/trade-history?page=${page}&page_size=20${typeParam}`);
      if (!res.ok) throw new Error('Failed to load trade history');
      const data = await res.json();
      setTrades(data.trades || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      setError('Failed to load trade history.');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="trade-history-loading">
        <div className="shop-spinner"></div>
        <p>Loading trade history...</p>
      </div>
    );
  }

  return (
    <div className="trade-history">
      <h2 className="trade-history-title">Trade History</h2>

      {error && <div className="trade-history-error">{error}</div>}

      {/* Filter buttons */}
      <div className="trade-history-filters">
        <button
          className={`trade-history-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All
        </button>
        <button
          className={`trade-history-filter-btn ${filter === 'sales' ? 'active' : ''}`}
          onClick={() => handleFilterChange('sales')}
        >
          Sales
        </button>
        <button
          className={`trade-history-filter-btn ${filter === 'purchases' ? 'active' : ''}`}
          onClick={() => handleFilterChange('purchases')}
        >
          Purchases
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="trade-history-empty">No trade history yet.</div>
      ) : (
        <>
          <table className="trade-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th>Price</th>
                <th>Tax</th>
                <th>Counterparty</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(trade => (
                <tr key={trade.id}>
                  <td>{formatDate(trade.completed_at)}</td>
                  <td>
                    <span className={`trade-type-badge ${trade.trade_type === 'sale' ? 'sold' : 'purchased'}`}>
                      {trade.trade_type === 'sale' ? 'Sold' : 'Purchased'}
                    </span>
                  </td>
                  <td className={RARITY_CLASS[trade.item_rarity] || ''}>
                    {trade.item_name}
                  </td>
                  <td>&#9670; {trade.price_shards.toLocaleString()}</td>
                  <td>
                    {trade.trade_type === 'sale' && trade.tax_shards != null
                      ? <>{'\u25C6'} {trade.tax_shards.toLocaleString()}</>
                      : '\u2014'}
                  </td>
                  <td>{trade.counterparty_alias || 'Anonymous'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="trade-history-pagination">
            <button
              className="trade-history-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>
            <span className="trade-history-page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="trade-history-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeHistory;
