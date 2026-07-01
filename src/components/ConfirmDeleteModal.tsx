import type { ReactNode } from 'react';
import { Modal } from './Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
}

export function ConfirmDeleteModal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Supprimer définitivement',
}: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose} centerTitle>
      <div className="confirm-delete-modal">
        {children}
        <div className="btn-row confirm-delete-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={() => void onConfirm()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
