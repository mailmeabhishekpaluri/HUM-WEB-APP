export function HUManityLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scales = { sm: 0.5, md: 0.75, lg: 1 };
  const s = scales[size];
  return (
    <svg width={Math.round(280*s)} height={Math.round(80*s)} viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="130" height="60" fill="#3191c2" rx="2"/>
      <text x="65" y="46" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="40" fill="white" textAnchor="middle">HUM</text>
      <text x="145" y="46" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="40" fill="#1a1a1a" textAnchor="start">anity</text>
      <text x="0" y="74" fontFamily="Arial, sans-serif" fontSize="14" fill="#666666">Humanity Uplifting Mankind</text>
    </svg>
  );
}
