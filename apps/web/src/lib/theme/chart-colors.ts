/**
 * Neutral chart colours per colour mode. Chart.js and Recharts paint via
 * JS/SVG attributes, which don't follow the CSS palette variables, so chart
 * components pick these with `useIsDark()` from ./color-mode.
 */
export function chartNeutrals(isDark: boolean) {
  return isDark
    ? {
        tick: '#9a948c',
        label: '#d3cec7',
        grid: 'rgba(244, 241, 236, 0.06)',
        tooltipBg: '#2a2521',
        pointBg: '#1b1815',
      }
    : {
        tick: '#a8a49e',
        label: '#44423f',
        grid: 'rgba(26, 26, 26, 0.04)',
        tooltipBg: '#1a1a1a',
        pointBg: '#ffffff',
      };
}
