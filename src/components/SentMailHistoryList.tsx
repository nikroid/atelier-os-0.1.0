import type { Contact } from '../types';
import type { SentMailLog } from '../types/sentMails';
import { contactFullName } from '../utils/helpers';
import { formatSentMailDate } from '../utils/sentMailLog';

interface SentMailHistoryListProps {
  logs: SentMailLog[];
  contacts: Contact[] | undefined;
  contactFilterId?: string | null;
  onSelect: (log: SentMailLog) => void;
  onClearFilter?: () => void;
}

function recipientSummary(
  log: SentMailLog,
  contactMap: Map<string, Contact>,
): string {
  const names = log.contactIds
    .map((id) => contactMap.get(id))
    .filter(Boolean)
    .map((c) => contactFullName(c!));
  if (names.length) return names.join(', ');
  return log.recipientEmails.join(', ');
}

export function SentMailHistoryList({
  logs,
  contacts,
  contactFilterId,
  onSelect,
  onClearFilter,
}: SentMailHistoryListProps) {
  const contactMap = new Map(contacts?.map((c) => [c.id, c]) ?? []);

  const filtered = contactFilterId
    ? logs.filter((log) => log.contactIds.includes(contactFilterId))
    : logs;

  if (!filtered.length) {
    return (
      <div className="empty-state sent-mail-empty">
        <p>
          {contactFilterId
            ? 'Aucun mail envoyé à ce contact depuis Atelier OS.'
            : 'Aucun mail enregistré. Les envois depuis la page Contacts apparaîtront ici.'}
        </p>
        {contactFilterId && onClearFilter && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClearFilter}>
            Voir tout l’historique
          </button>
        )}
      </div>
    );
  }

  const filterContact = contactFilterId ? contactMap.get(contactFilterId) : undefined;

  return (
    <div className="sent-mail-history">
      {filterContact && onClearFilter && (
        <div className="sent-mail-filter-banner">
          <span>
            Filtre : <strong>{contactFullName(filterContact)}</strong>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClearFilter}>
            Tout afficher
          </button>
        </div>
      )}
      <div className="list-table">
        {filtered.map((log) => (
          <button
            key={log.id}
            type="button"
            className="list-row sent-mail-row"
            onClick={() => onSelect(log)}
          >
            <div className="list-content">
              <h3>{log.subject || '(Sans objet)'}</h3>
              {log.isGroup && <span className="badge">Groupé</span>}
              <p className="meta">{recipientSummary(log, contactMap)}</p>
              <p className="meta sent-mail-date">{formatSentMailDate(log.sentAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
