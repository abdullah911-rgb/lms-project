import React, { useState } from 'react';

/**
 * StarRating — interactive (editable) or display-only star rating widget.
 *
 * Props:
 *  value      {number}  0-5 (supports decimals for display)
 *  onChange   {fn}      if provided, makes the widget interactive
 *  size       {number}  SVG size in px (default 22)
 *  className  {string}  extra class names
 */
export default function StarRating({ value = 0, onChange, size = 22, className = '' }) {
  const [hovered, setHovered] = useState(0);

  const isInteractive = typeof onChange === 'function';
  const display = isInteractive ? (hovered || value) : value;

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={isInteractive ? 'radiogroup' : undefined}
      aria-label={`Rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const halfFilled = !filled && display >= star - 0.5;

        return (
          <span
            key={star}
            onClick={isInteractive ? () => onChange(star) : undefined}
            onMouseEnter={isInteractive ? () => setHovered(star) : undefined}
            onMouseLeave={isInteractive ? () => setHovered(0) : undefined}
            style={{
              cursor: isInteractive ? 'pointer' : 'default',
              display: 'inline-block',
              position: 'relative',
              width: size,
              height: size,
              flexShrink: 0,
            }}
            role={isInteractive ? 'radio' : undefined}
            aria-checked={isInteractive ? value === star : undefined}
            aria-label={isInteractive ? `${star} star${star > 1 ? 's' : ''}` : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              width={size}
              height={size}
              fill={filled ? '#FBBF24' : halfFilled ? 'url(#half)' : '#E5E7EB'}
              stroke={filled || halfFilled ? '#F59E0B' : '#D1D5DB'}
              strokeWidth="1.2"
              style={{ display: 'block', transition: 'fill 0.15s, transform 0.12s', transform: isInteractive && hovered === star ? 'scale(1.2)' : 'scale(1)' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#FBBF24" />
                  <stop offset="50%" stopColor="#E5E7EB" />
                </linearGradient>
              </defs>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </span>
        );
      })}
    </span>
  );
}
