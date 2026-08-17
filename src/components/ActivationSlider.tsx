import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import './ActivationSlider.css';

interface ActivationSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/**
 * The 0 to 10 activation scale.
 *
 * Deliberately monochrome. Colouring the high end red would tell the user their
 * own number is an emergency, which is the association this whole product is
 * trying to loosen.
 */
export function ActivationSlider({ id, label, value, onChange }: ActivationSliderProps) {
  const { t } = useTranslation();

  return (
    <div className="activation">
      <div className="activation__heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{value}/10</output>
      </div>
      <input
        id={id}
        className="activation__range"
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--activation-progress': `${value * 10}%` } as CSSProperties}
      />
      <div className="activation__scale">
        <span>{t('alert.activationScale.low')}</span>
        <span>{t('alert.activationScale.high')}</span>
      </div>
    </div>
  );
}
