import React from 'react';
import './HelpIcon.css';

interface Props {
  href: string;
  tooltip?: string;
}

const HelpIcon: React.FC<Props> = ({ href, tooltip = 'Help' }) => (
  <a
    className="help-icon"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    title={tooltip}
  >
    ?
  </a>
);

export default HelpIcon;
