import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActivationSlider } from '../components/ActivationSlider';
import { HabituationChart } from '../features/ladder/HabituationChart';
import { createId } from '../lib/id';
import { useLadderItems, useLive, useWrite } from '../storage/hooks';
import type { LadderItem, LadderSession } from '../storage/types';
import './Ladder.css';

const CHECKPOINTS = [0, 5, 10, 15, 20] as const;

/**
 * The life ladder.
 *
 * Ordinary, safe activities that have been avoided, ranked by expected tension
 * and repeated until they are ordinary again. Two boundaries are stated in the
 * copy and meant literally: this is not for revisiting traumatic memories, and
 * it is not for facing situations that are genuinely dangerous. Neither belongs
 * in a self-guided tool.
 *
 * A live session records tension at fixed checkpoints. Nothing is timed for the
 * user and nothing is scored.
 */
export function Ladder() {
  const { t } = useTranslation();
  const items = useLadderItems();
  const sessions = useLive((storage) => storage.getLadderSessions());
  const write = useWrite();

  const [title, setTitle] = useState('');
  const [expected, setExpected] = useState(4);
  const [active, setActive] = useState<LadderSession | null>(null);
  const [reading, setReading] = useState(5);

  const addItem = () => {
    if (!title.trim()) return;
    const item: LadderItem = {
      id: createId(),
      title: title.trim(),
      expectedActivation: expected,
      order: (items?.length ?? 0) + 1,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    void write((storage) => storage.saveLadderItem(item));
    setTitle('');
  };

  const startSession = (itemId: string) => {
    const session: LadderSession = {
      id: createId(),
      itemId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      readings: [],
      completed: false,
      note: '',
    };
    setActive(session);
    setReading(5);
    void write((storage) => storage.saveLadderSession(session));
  };

  const record = (minute: number) => {
    if (!active) return;
    const next: LadderSession = {
      ...active,
      readings: [...active.readings.filter((r) => r.minute !== minute), { minute, value: reading }].sort(
        (a, b) => a.minute - b.minute,
      ),
    };
    setActive(next);
    void write((storage) => storage.saveLadderSession(next));
  };

  const endSession = () => {
    if (!active) return;
    const ended: LadderSession = { ...active, endedAt: new Date().toISOString(), completed: true };
    void write((storage) => storage.saveLadderSession(ended));
    setActive(null);
  };

  return (
    <div className="screen ladder">
      <div className="stack stack--tight">
        <h1>{t('ladder.title')}</h1>
        <p className="lede">{t('ladder.helper')}</p>
      </div>

      <p className="banner">{t('ladder.boundary')}</p>

      {active ? (
        <section className="card card--calm stack">
          <h2>{t('ladder.inSession')}</h2>
          <ActivationSlider id="suds" label={t('ladder.sudsPrompt')} value={reading} onChange={setReading} />
          <div className="ladder__checkpoints">
            {CHECKPOINTS.map((minute) => {
              const recorded = active.readings.some((r) => r.minute === minute);
              return (
                <button
                  key={minute}
                  type="button"
                  className="button button--secondary"
                  aria-pressed={recorded}
                  onClick={() => record(minute)}
                >
                  {t('ladder.sessionMinute', { minute })}
                </button>
              );
            })}
          </div>
          <button type="button" className="button button--primary button--full" onClick={endSession}>
            {t('ladder.completeSession')}
          </button>
        </section>
      ) : null}

      <section className="card stack">
        <h2>{t('ladder.addItem')}</h2>
        <label className="field">
          <span className="field__label">{t('ladder.addItem')}</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <ActivationSlider
          id="expected"
          label={t('ladder.expectedActivation')}
          value={expected}
          onChange={setExpected}
        />
        <button type="button" className="button button--secondary" disabled={!title.trim()} onClick={addItem}>
          {t('common.add')}
        </button>
      </section>

      <section className="stack">
        {items === undefined ? null : items.length === 0 ? (
          <p className="muted">{t('ladder.empty')}</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="card ladder-item">
              <div className="ladder-item__head">
                <div className="stack stack--tight">
                  <h3>{item.title}</h3>
                  <span className="step-count">
                    {t('ladder.expectedActivation')}: {item.expectedActivation}/10
                  </span>
                </div>
                <button
                  type="button"
                  className="button button--quiet"
                  aria-label={t('common.delete')}
                  onClick={() => void write((storage) => storage.deleteLadderItem(item.id))}
                >
                  <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                className="button button--secondary"
                disabled={active !== null}
                onClick={() => startSession(item.id)}
              >
                {t('ladder.startSession')}
              </button>

              <HabituationChart sessions={(sessions ?? []).filter((s) => s.itemId === item.id)} />
            </article>
          ))
        )}
      </section>

      <p className="banner">{t('ladder.seekSupport')}</p>
    </div>
  );
}
