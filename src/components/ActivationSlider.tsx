import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import './ActivationSlider.css';

interface ActivationSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export const ACTIVATION_MIN = 0;
export const ACTIVATION_MAX = 10;

/**
 * The 0 to 10 activation scale.
 *
 * Deliberately monochrome. Colouring the high end red would tell the user their
 * own number is an emergency, which is the association this product exists to
 * loosen.
 *
 * The filled portion is a real element positioned with logical properties
 * rather than a gradient on the track. A gradient has to be flipped by hand for
 * RTL, and the browser already flips the range itself, so the two cancelled out
 * and the fill appeared on the wrong side in Arabic.
 */
export function ActivationSlider({ id, label, value, onChange }: ActivationSliderProps) {
  const { t } = useTranslation();
  const fraction = (value - ACTIVATION_MIN) / (ACTIVATION_MAX - ACTIVATION_MIN);

  return (
    <div className="activation">
      <div className="activation__heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {value}/{ACTIVATION_MAX}
        </output>
      </div>

      <div className="activation__control">
        <div className="activation__track" aria-hidden="true">
          {/* Offset by half a thumb so the fill ends under the thumb's centre. */}
          <div className="activation__fill" style={{ '--fraction': fraction } as CSSProperties} />
        </div>
        <input
          id={id}
          className="activation__range"
          type="range"
          min={ACTIVATION_MIN}
          max={ACTIVATION_MAX}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>

      <div className="activation__scale">
        <span>{t('alert.activationScale.low')}</span>
        <span>{t('alert.activationScale.high')}</span>
      </div>
    </div>
  );
}
