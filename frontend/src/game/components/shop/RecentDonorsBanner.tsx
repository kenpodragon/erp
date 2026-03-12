import React, { useState, useEffect } from 'react';

interface RecentDonor {
  player_alias: string;
  created_at: string;
}

interface Props {
  donors: RecentDonor[];
}

const RecentDonorsBanner: React.FC<Props> = ({ donors }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (donors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % donors.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [donors.length]);

  if (donors.length === 0) return null;

  const donor = donors[currentIndex];

  return (
    <div className="recent-donors-banner">
      <span className="banner-heart">&#10084;</span>
      <span className="banner-text">
        {donor.player_alias} just supported Elysium Rising!
      </span>
    </div>
  );
};

export default RecentDonorsBanner;
