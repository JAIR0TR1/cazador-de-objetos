import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type IconName =
  | 'home'
  | 'scan'
  | 'grid'
  | 'user'
  | 'close'
  | 'check'
  | 'share'
  | 'trash'
  | 'search'
  | 'chevron-left'
  | 'chevron-right'
  | 'camera'
  | 'bolt'
  | 'flame'
  | 'cube'
  | 'refresh'
  | 'sparkle'
  | 'lock'
  | 'rotate';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Set de íconos lineales propio (trazo 1.75) para mantener la identidad visual. */
export function Icon({ name, size = 24, color = colors.text, strokeWidth = 1.75 }: Props) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {name === 'home' && <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" {...p} />}
      {name === 'scan' && (
        <>
          <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" {...p} />
          <Circle cx={12} cy={12} r={3.2} {...p} />
        </>
      )}
      {name === 'grid' && <Path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" {...p} />}
      {name === 'user' && (
        <>
          <Circle cx={12} cy={8.5} r={3.8} {...p} />
          <Path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" {...p} />
        </>
      )}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
      {name === 'check' && <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} />}
      {name === 'share' && <Path d="M12 15V4m0 0L8 8m4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" {...p} />}
      {name === 'trash' && <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" {...p} />}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={6.5} {...p} />
          <Path d="m20 20-4.2-4.2" {...p} />
        </>
      )}
      {name === 'chevron-left' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'chevron-right' && <Path d="M9 5l7 7-7 7" {...p} />}
      {name === 'camera' && (
        <>
          <Path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" {...p} />
          <Circle cx={12} cy={12.5} r={3.5} {...p} />
        </>
      )}
      {name === 'bolt' && <Path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" {...p} />}
      {name === 'flame' && <Path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.9 3.6-5.6 3.6-9.4 2.6 1.5 4 3.6 4.2 6 .9-.6 1.5-1.7 1.6-2.9C17.4 10.6 18 12.6 18 15.4 18 18.6 15.6 21 12 21z" {...p} />}
      {name === 'cube' && <Path d="M12 3 4 7.5v9L12 21l8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" {...p} />}
      {name === 'refresh' && <Path d="M19.5 8A8 8 0 0 0 5 7.5M4.5 16A8 8 0 0 0 19 16.5M19.5 3.5V8H15M4.5 20.5V16H9" {...p} />}
      {name === 'sparkle' && <Path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 16c.3 1.8 1 2.6 2.5 3-1.5.3-2.2 1.1-2.5 3-.3-1.9-1-2.7-2.5-3 1.5-.4 2.2-1.2 2.5-3z" {...p} />}
      {name === 'lock' && <Path d="M6.5 11h11a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" {...p} />}
      {name === 'rotate' && <Path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" {...p} />}
    </Svg>
  );
}
