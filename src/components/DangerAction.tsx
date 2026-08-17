import type { ReactNode } from 'react';
import './DangerAction.css';

/**
 * The only component in the app permitted to use the danger colour.
 *
 * Red here means one thing: the user has reported a possible immediate danger,
 * and this is an action for that situation. It never marks a high activation
 * score, a missed day, or a destructive settings button, because an alarm
 * colour attached to an ordinary number teaches the nervous system exactly the
 * wrong lesson.
 *
 * `src/design-system/danger.guard.test.ts` fails the build if any other module
 * references the token.
 */

interface DangerActionProps {
  children: ReactNode;
  /** Rendered as a link when given a `tel:` or similar href. */
  href?: string;
  onClick?: () => void;
  /** Supporting text, for example where a number was verified. */
  note?: ReactNode;
}

export function DangerAction({ children, href, onClick, note }: DangerActionProps) {
  const content = (
    <>
      <span className="danger-action__label">{children}</span>
      {note ? <span className="danger-action__note">{note}</span> : null}
    </>
  );

  if (href) {
    return (
      <a className="danger-action" href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className="danger-action" type="button" onClick={onClick}>
      {content}
    </button>
  );
}

/** A quieter variant for destructive data actions, which must not read as an emergency. */
export function DestructiveAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="destructive-action" type="button" onClick={onClick}>
      {children}
    </button>
  );
}
