import { useIsMobile } from "@/hooks/use-mobile";

export function WorldMapBackground({ 
  opacity = 0.08,
  primaryColor = '#6366f1',
  secondaryColor = '#8b5cf6',
  showGrid = true,
  gridOpacity = 0.4,
  imageUrl = null,
  imageUrlDark = null,
  imageUrlMobile = null,
  imageUrlMobileDark = null,
  bgColor = '#0a0a0a'
}: {
  opacity?: number;
  primaryColor?: string;
  secondaryColor?: string;
  showGrid?: boolean;
  gridOpacity?: number;
  imageUrl?: string | null;
  imageUrlDark?: string | null;
  imageUrlMobile?: string | null;
  imageUrlMobileDark?: string | null;
  bgColor?: string;
}) {
  const isMobile = useIsMobile();

  // Determinar se o fundo é claro ou escuro
  const isLightBackground = () => {
    // Remove # e converte hex para RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Fórmula de luminosidade
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Escolher a imagem correta baseada no dispositivo e fundo
  const getSelectedImage = () => {
    const isLight = isLightBackground();
    
    if (isMobile) {
      // Mobile: usar imagens mobile se disponíveis, senão fallback para desktop
      if (isLight) {
        return imageUrlMobileDark || imageUrlDark;
      } else {
        return imageUrlMobile || imageUrl;
      }
    } else {
      // Desktop: usar imagens desktop
      if (isLight) {
        return imageUrlDark;
      } else {
        return imageUrl;
      }
    }
  };

  const selectedImage = getSelectedImage();

  // Se houver uma imagem, use ela ao invés do SVG
  if (selectedImage) {
    return (
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${selectedImage})`,
          // Mobile: esticar para preencher 100% da largura e altura do container
          // Desktop: cover para manter proporção
          backgroundSize: isMobile ? '100% 100%' : 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: opacity,
          zIndex: 0
        }}
      />
    );
  }

  // Caso contrário, use o SVG padrão
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ opacity }}>
      <svg
        viewBox="0 0 2000 857"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: primaryColor, stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: primaryColor, stopOpacity: 0.2 }} />
          </linearGradient>
        </defs>
        
        {/* Simplified World Map - Major continents */}
        <g fill="url(#mapGradient)" stroke={secondaryColor} strokeWidth="0.8">
          
          {/* North America */}
          <path d="M150,150 L250,120 L320,140 L350,180 L380,200 L400,240 L390,280 L360,320 L320,340 L280,350 L240,340 L200,320 L180,280 L160,240 L150,200 Z" />
          <path d="M250,200 L280,190 L310,200 L330,220 L340,250 L330,280 L310,300 L280,310 L250,300 L230,280 L225,250 Z" />
          
          {/* South America */}
          <path d="M380,380 L420,370 L460,390 L480,420 L490,460 L480,520 L460,580 L440,620 L420,640 L390,650 L360,640 L340,610 L330,570 L340,520 L360,470 L370,430 Z" />
          
          {/* Europe */}
          <path d="M850,180 L920,170 L980,190 L1010,220 L1020,250 L1000,280 L970,290 L930,285 L890,270 L860,250 L850,220 Z" />
          <path d="M900,200 L930,195 L960,210 L980,235 L970,260 L940,270 L910,265 L890,245 Z" />
          
          {/* Africa */}
          <path d="M900,320 L950,310 L1000,330 L1030,370 L1040,420 L1035,480 L1020,540 L1000,590 L970,630 L930,650 L890,640 L860,610 L850,560 L860,500 L880,440 L890,380 Z" />
          
          {/* Asia */}
          <path d="M1050,150 L1150,140 L1250,160 L1350,180 L1420,210 L1460,250 L1480,300 L1470,350 L1440,390 L1400,420 L1350,440 L1300,450 L1250,440 L1200,420 L1150,390 L1100,350 L1070,300 L1060,250 L1050,200 Z" />
          <path d="M1100,280 L1180,270 L1260,290 L1320,320 L1360,360 L1380,400 L1370,440 L1340,470 L1290,485 L1240,480 L1190,460 L1150,430 L1120,390 L1100,340 Z" />
          
          {/* India */}
          <path d="M1200,400 L1240,390 L1270,410 L1280,450 L1270,490 L1250,520 L1220,540 L1190,535 L1170,510 L1165,470 L1175,430 Z" />
          
          {/* Australia */}
          <path d="M1450,580 L1520,570 L1580,590 L1610,630 L1615,670 L1600,700 L1570,715 L1530,720 L1490,710 L1460,680 L1450,640 Z" />
          
          {/* Antarctica (simplified bottom arc) */}
          <path d="M200,750 Q1000,820 1800,750" fill="none" strokeWidth="2.5" />
          
          {/* Greenland */}
          <path d="M700,80 L760,75 L800,90 L815,120 L810,150 L785,170 L750,175 L720,165 L700,140 L695,110 Z" />
          
          {/* Japan */}
          <path d="M1550,280 L1570,275 L1585,285 L1590,305 L1585,330 L1570,345 L1555,348 L1545,340 L1540,320 L1545,295 Z" />
          
          {/* UK */}
          <path d="M840,190 L855,188 L865,195 L868,210 L863,225 L850,228 L840,220 L838,205 Z" />
          
          {/* Scandinavia */}
          <path d="M920,100 L950,95 L975,110 L985,135 L980,160 L960,175 L935,178 L915,165 L910,140 L915,115 Z" />
          
          {/* Southeast Asia */}
          <path d="M1350,460 L1390,455 L1420,475 L1435,505 L1430,535 L1410,555 L1380,560 L1355,550 L1340,525 L1345,490 Z" />
          
          {/* Grid lines for effect */}
          {showGrid && (
            <>
              <line x1="0" y1="214" x2="2000" y2="214" strokeWidth="0.5" opacity={gridOpacity} stroke={primaryColor} />
              <line x1="0" y1="428" x2="2000" y2="428" strokeWidth="0.5" opacity={gridOpacity} stroke={primaryColor} />
              <line x1="0" y1="642" x2="2000" y2="642" strokeWidth="0.5" opacity={gridOpacity} stroke={primaryColor} />
              
              <line x1="400" y1="0" x2="400" y2="857" strokeWidth="0.5" opacity={gridOpacity * 0.7} stroke={primaryColor} />
              <line x1="800" y1="0" x2="800" y2="857" strokeWidth="0.5" opacity={gridOpacity * 0.7} stroke={primaryColor} />
              <line x1="1200" y1="0" x2="1200" y2="857" strokeWidth="0.5" opacity={gridOpacity * 0.7} stroke={primaryColor} />
              <line x1="1600" y1="0" x2="1600" y2="857" strokeWidth="0.5" opacity={gridOpacity * 0.7} stroke={primaryColor} />
            </>
          )}
        </g>
        
        {/* Subtle glow effect */}
        <circle cx="1000" cy="400" r="600" fill={primaryColor} opacity="0.01" />
      </svg>
    </div>
  );
}