import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function DatabaseStatus() {
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = 'http://localhost:8000'

  const checkStatus = () => {
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/db-check`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        setDbStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching db-check:', err)
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    checkStatus()
  }, [])

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Database Connectivity Test</h1>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/">Back to Home</Link>
        <button onClick={checkStatus} style={{ marginLeft: '20px' }}>Refresh</button>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
        {loading ? (
          <p>Connecting to backend...</p>
        ) : error ? (
          <div style={{ color: '#ff6b6b', padding: '10px', border: '1px solid #ff6b6b', borderRadius: '4px' }}>
            <h3>Connection Failed</h3>
            <p>{error}</p>
            <p>Ensure the backend is running at {API_URL}</p>
          </div>
        ) : (
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#4caf50' }}>Status: {dbStatus.status}</h3>
            <p><strong>Database:</strong> {dbStatus.database}</p>
            <p><strong>Tables Found:</strong> {dbStatus.tables.length}</p>
            {dbStatus.tables.length > 0 ? (
              <ul>
                {dbStatus.tables.map((table: string) => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
            ) : (
              <p>No tables found in public schema.</p>
            )}
            <hr style={{ borderColor: '#333' }} />
            <details>
              <summary style={{ cursor: 'pointer', color: '#888' }}>View Raw JSON</summary>
              <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                {JSON.stringify(dbStatus, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default DatabaseStatus
