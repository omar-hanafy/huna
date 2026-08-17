import { useTranslation } from 'react-i18next';
import type { LadderSession } from '../../storage/types';

interface HabituationChartProps {
  sessions: readonly LadderSession[];
}

const WIDTH = 320;
const HEIGHT = 160;
const PADDING = 28;
const MAX_MINUTE = 20;
const MAX_VALUE = 10;

/**
 * What actually happened during an exposure.
 *
 * This deliberately does not draw an idealised habituation curve, and it does
 * not tell the user that tension "should" fall. Sometimes it does not, and a
 * chart implying otherwise is at its most harmful on exactly the day it did
 * not. It plots the readings the user gave, and says so.
 *
 * The data is also given as a table, because a line in an SVG is not available
 * to a screen reader and because the numbers are the point.
 */
export function HabituationChart({ sessions }: HabituationChartProps) {
  const { t } = useTranslation();
  const withReadings = sessions.filter((session) => session.readings.length > 1);

  if (withReadings.length === 0) return null;

  const x = (minute: number) => PADDING + (Math.min(minute, MAX_MINUTE) / MAX_MINUTE) * (WIDTH - PADDING * 2);
  const y = (value: number) => HEIGHT - PADDING - (value / MAX_VALUE) * (HEIGHT - PADDING * 2);

  return (
    <section className="stack">
      <div className="stack stack--tight">
        <h3>{t('ladder.curveTitle')}</h3>
        <p className="muted">{t('ladder.curveNote')}</p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="habituation"
        role="img"
        aria-label={t('ladder.curveTitle')}
      >
        <line x1={PADDING} y1={y(0)} x2={WIDTH - PADDING} y2={y(0)} className="habituation__axis" />
        <line x1={PADDING} y1={y(0)} x2={PADDING} y2={y(MAX_VALUE)} className="habituation__axis" />

        {withReadings.map((session) => (
          <polyline
            key={session.id}
            className="habituation__line"
            points={session.readings.map((reading) => `${x(reading.minute)},${y(reading.value)}`).join(' ')}
          />
        ))}
      </svg>

      <table className="data-table">
        <caption className="sr-only">{t('progress.chartTable')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('ladder.sessionMinute', { minute: '' }).trim()}</th>
            {[0, 5, 10, 15, 20].map((minute) => (
              <th key={minute} scope="col">
                {minute}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withReadings.map((session, index) => (
            <tr key={session.id}>
              <th scope="row">{index + 1}</th>
              {[0, 5, 10, 15, 20].map((minute) => {
                const reading = session.readings.find((item) => item.minute === minute);
                return <td key={minute}>{reading ? reading.value : '-'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
