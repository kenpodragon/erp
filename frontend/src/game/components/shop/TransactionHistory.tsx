import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import RefundRequestModal from './RefundRequestModal';
import './TransactionHistory.css';

interface Transaction {
  id: number;
  created_at: string;
  source_type: string;
  description: string;
  shard_amount: number;
  balance_after: number;
  refund_eligible: boolean;
  stripe_payment_id?: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  refund: 'Refund',
  bonus: 'Bonus',
  spend: 'Spend',
  admin: 'Admin',
  achievement: 'Achievement',
};

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [refundTransaction, setRefundTransaction] = useState<Transaction | null>(null);

  const pageSize = 20;

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const filterParam = filterType !== 'all' ? `&source_type=${filterType}` : '';
      const res = await api.get(`/api/payments/transactions?page=${page}&page_size=${pageSize}${filterParam}`);
      if (res.ok) {
        const data: TransactionsResponse = await res.json();
        setTransactions(data.transactions || []);
        setTotalPages(data.total_pages || 1);
      }
    } catch {
      // Silently fail — transactions are non-critical
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRefundSubmit = () => {
    setRefundTransaction(null);
    fetchTransactions(); // Refresh
  };

  return (
    <div className="tx-history">
      <div className="tx-header">
        <h2 className="tx-title">Transaction History</h2>
        <select
          className="tx-filter"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
        >
          <option value="all">All Types</option>
          <option value="purchase">Purchases</option>
          <option value="refund">Refunds</option>
          <option value="bonus">Bonuses</option>
          <option value="spend">Spending</option>
          <option value="achievement">Achievements</option>
        </select>
      </div>

      {loading && (
        <div className="tx-loading">Loading transactions...</div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="tx-empty">No transactions found.</div>
      )}

      {!loading && transactions.length > 0 && (
        <div className="tx-table-wrapper">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th className="tx-col-amount">Amount</th>
                <th className="tx-col-balance">Balance</th>
                <th className="tx-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="tx-date">{formatDate(tx.created_at)}</td>
                  <td>
                    <span className={`tx-type-badge tx-type-${tx.source_type}`}>
                      {SOURCE_TYPE_LABELS[tx.source_type] || tx.source_type}
                    </span>
                  </td>
                  <td className="tx-desc">{tx.description}</td>
                  <td className={`tx-amount ${tx.shard_amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.shard_amount >= 0 ? '+' : ''}{tx.shard_amount.toLocaleString()}
                  </td>
                  <td className="tx-balance">{tx.balance_after.toLocaleString()}</td>
                  <td className="tx-actions">
                    {tx.refund_eligible && (
                      <button
                        className="tx-refund-btn"
                        onClick={() => setRefundTransaction(tx)}
                      >
                        Request Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="tx-pagination">
          <button
            className="tx-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="tx-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="tx-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Refund modal */}
      {refundTransaction && (
        <RefundRequestModal
          transaction={refundTransaction}
          onClose={() => setRefundTransaction(null)}
          onSubmit={handleRefundSubmit}
        />
      )}
    </div>
  );
};

export default TransactionHistory;
