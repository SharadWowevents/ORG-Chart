import React from 'react';

export const CameraSvg = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="3.1" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

export const PlusSvg = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

export const MinusSvg = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

export const LogoPlaceholderSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M7.5 15.5l3.2-3.6 2.4 2.4 3.4-4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronSvg = ({ collapsed }) => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .18s" }}>
    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DefaultBrandSvg = () => (
  <svg className="brand-mark" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="7" r="4.2" fill="var(--accent)"/>
    <path d="M16 11.2 V17 M16 17 H8 M16 17 H24 M8 17 V19.5 M24 17 V19.5" stroke="var(--accent)" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    <circle cx="8" cy="23.5" r="3.6" fill="var(--gold)"/>
    <circle cx="24" cy="23.5" r="3.6" fill="var(--gold)"/>
  </svg>
);