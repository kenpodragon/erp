import React, { useState } from 'react';

interface Props {
  src: string;
  alt: string;
}

const GuideScreenshot: React.FC<Props> = ({ src, alt }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="guide-screenshot" onClick={() => setOpen(true)}>
        <img src={`/help/${src}`} alt={alt} loading="lazy" />
        <span className="guide-screenshot-hint">Click to enlarge</span>
      </div>
      {open && (
        <div className="guide-lightbox" onClick={() => setOpen(false)}>
          <img src={`/help/${src}`} alt={alt} />
          <button className="guide-lightbox-close">&times;</button>
        </div>
      )}
    </>
  );
};

export default GuideScreenshot;
