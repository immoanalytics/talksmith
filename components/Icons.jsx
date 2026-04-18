// Icons.jsx — minimal line icons for Talksmith
const Icon = ({ d, size = 14, stroke = 1.5, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d}
  </svg>
);

const Icons = {
  mic:       <path d="M8 1.5a2 2 0 012 2v4a2 2 0 01-4 0v-4a2 2 0 012-2zM4 7.5a4 4 0 008 0M8 11.5v3M5.5 14.5h5" />,
  play:      <path d="M4 3l9 5-9 5V3z" fill="currentColor" stroke="none" />,
  pause:     <><rect x="4" y="3" width="3" height="10" fill="currentColor" stroke="none"/><rect x="9" y="3" width="3" height="10" fill="currentColor" stroke="none"/></>,
  stop:      <rect x="4" y="4" width="8" height="8" fill="currentColor" stroke="none"/>,
  chev:      <path d="M6 3l4 5-4 5" />,
  chevDown:  <path d="M3 6l5 4 5-4" />,
  chevUp:    <path d="M3 10l5-4 5 4" />,
  x:         <path d="M4 4l8 8M12 4l-8 8" />,
  check:     <path d="M3 8.5l3 3 7-7" />,
  dot:       <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/>,
  sparkle:   <path d="M8 2v4M8 10v4M2 8h4M10 8h4M4 4l2.5 2.5M9.5 9.5L12 12M12 4L9.5 6.5M6.5 9.5L4 12"/>,
  wave:      <path d="M1 8c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0"/>,
  clock:     <><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4l2.5 1.5"/></>,
  cal:       <><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1.5v3M11 1.5v3M2 6.5h12"/></>,
  user:      <><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/></>,
  users:     <><circle cx="6" cy="6" r="2.5"/><path d="M1.5 14c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5"/><circle cx="12" cy="5.5" r="2" /><path d="M10.5 14c0-2.5 1.5-4 3-4"/></>,
  keyboard:  <><rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M4 7h.01M7 7h.01M10 7h.01M13 7h.01M4 10h8"/></>,
  bell:      <path d="M4 11c0-4 1.5-6 4-6s4 2 4 6h1v1H3v-1h1zM6.5 13.5a1.5 1.5 0 003 0"/>,
  bellOff:   <><path d="M4 11c0-4 1.5-6 4-6s4 2 4 6h1v1H3v-1h1zM6.5 13.5a1.5 1.5 0 003 0"/><path d="M2 2l12 12"/></>,
  settings:  <><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13"/></>,
  search:    <><circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/></>,
  expand:    <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"/>,
  minimize:  <path d="M6 3v3H3M10 3v3h3M10 13v-3h3M6 13v-3H3"/>,
  trendUp:   <path d="M2 11l4-4 3 3 5-6M10 4h4v4"/>,
  arrow:     <path d="M3 8h10M9 4l4 4-4 4"/>,
  home:      <path d="M2 8l6-5 6 5v6H9v-4H7v4H2V8z"/>,
  pulse:     <path d="M1 8h3l1.5-4 2 8 1.5-4h6"/>,
  list:      <path d="M3 4h10M3 8h10M3 12h10"/>,
  circle:    <circle cx="8" cy="8" r="5.5"/>,
  interrupt: <path d="M3 4l4 4-4 4M8 3v10M13 4l-4 4 4 4"/>,
  flag:      <path d="M3 1v13M3 2h9l-2 3 2 3H3"/>,
  goal:      <><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/></>,
  info:      <><circle cx="8" cy="8" r="6"/><path d="M8 7.5v4M8 5v.01"/></>,
  snooze:    <><circle cx="8" cy="8" r="6"/><path d="M6 6h4l-4 4h4"/></>,
  moon:      <path d="M13 9.5A5 5 0 017.5 3a1 1 0 00-1-1.3 6 6 0 107.9 7.9 1 1 0 00-1.4-1z"/>,
  sun:       <><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13"/></>,
};

const I = (name, props = {}) => <Icon d={Icons[name]} {...props} />;

window.I = I;
window.Icons = Icons;
