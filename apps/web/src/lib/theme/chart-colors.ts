/**
 * Neutral chart colours per colour mode. Chart.js and Recharts paint via
 * JS/SVG attributes, which don't follow the CSS palette variables, so chart
 * components pick these with `useIsDark()` from ./color-mode.
 */
export function chartNeutrals(isDark: boolean) {
  return isDark
    ? {
        tick: '#949494',
        label: '#c8c8c8',
        grid: 'rgba(255, 255, 255, 0.06)',
        tooltipBg: '#262626',
        pointBg: '#1b1b1b',
      }
    : {
        tick: '#a4a4a4',
        label: '#555555',
        grid: 'rgba(0, 0, 0, 0.05)',
        tooltipBg: '#222222',
        pointBg: '#ffffff',
      };
}
