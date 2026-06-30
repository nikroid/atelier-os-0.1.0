import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { TemplatePdfRender } from './editor/TemplatePdfRender';
import { useAllTemplates, useArtistMap, useArtists, useWorks } from '../hooks/useDatabase';
import { uid } from '../db/database';
import type { DocBlock, DocTemplate } from '../types/templates';
import type { Work } from '../types';
import {
  cloneBlob,
  formatAttachmentSize,
  MAX_MAIL_ATTACHMENTS_BYTES,
  totalAttachmentBytes,
  type MailAttachmentDraft,
} from '../utils/mailAttachments';
import { generateTemplateDocumentBlob } from '../utils/templatePdf';
import type { TemplateContext } from '../utils/templateFields';
import { enrichTemplateContexts } from '../utils/templateMediaContext';

interface ContactMailAttachmentsProps {
  disabled?: boolean;
  attachments: MailAttachmentDraft[];
  onChange: (attachments: MailAttachmentDraft[]) => void;
}

export function ContactMailAttachments({
  disabled,
  attachments,
  onChange,
}: ContactMailAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templates = useAllTemplates();
  const works = useWorks();
  const artists = useArtists();
  const artistMap = useArtistMap(artists);

  const [pdfTemplateId, setPdfTemplateId] = useState('');
  const [selectedWorkIds, setSelectedWorkIds] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfRender, setPdfRender] = useState<{
    template: DocTemplate;
    ctx: TemplateContext;
    root?: DocBlock;
  } | null>(null);

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState('');
  const totalBytes = totalAttachmentBytes(attachments);
  const nearLimit = totalBytes > MAX_MAIL_ATTACHMENTS_BYTES * 0.85;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setFileError('');
    setLoadingFiles(true);
    try {
      const next = [...attachments];
      for (const file of files) {
        const mimeType = file.type || 'application/octet-stream';
        const blob = await cloneBlob(file, mimeType);
        next.push({
          id: uid('att'),
          filename: file.name,
          mimeType,
          blob,
          source: 'file',
        });
      }
      onChange(next);
    } catch {
      setFileError('Impossible de lire le fichier sélectionné. Réessayez.');
    } finally {
      setLoadingFiles(false);
    }
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const toggleWork = (id: string) => {
    const next = new Set(selectedWorkIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWorkIds(next);
  };

  const addPdfCatalogue = async () => {
    const tpl = templates?.find((t) => t.id === pdfTemplateId);
    const selectedWorks = works?.filter((w) => selectedWorkIds.has(w.id)) ?? [];
    if (!tpl) {
      setPdfError('Sélectionnez un modèle PDF.');
      return;
    }
    if (!selectedWorks.length) {
      setPdfError('Sélectionnez au moins une œuvre.');
      return;
    }

    setPdfError('');
    setGeneratingPdf(true);
    try {
      const contexts = await enrichTemplateContexts(
        selectedWorks.map((work: Work) => ({
          work,
          artist: artistMap.get(work.artisteId),
        })),
      );

      const rawBlob = await generateTemplateDocumentBlob(
        tpl,
        contexts,
        undefined,
        undefined,
        async (root, ctx) => {
          flushSync(() => setPdfRender({ template: tpl, ctx, root }));
        },
      );

      const blob = await cloneBlob(rawBlob, 'application/pdf');

      const filename = `${tpl.nom.replace(/\s+/g, '-').toLowerCase()}-${selectedWorks.length}oeuvres.pdf`;
      onChange([
        ...attachments,
        {
          id: uid('att'),
          filename,
          mimeType: 'application/pdf',
          blob,
          source: 'pdf',
        },
      ]);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF.');
    } finally {
      setGeneratingPdf(false);
      setPdfRender(null);
    }
  };

  return (
    <>
      {pdfRender && (
        <TemplatePdfRender
          template={pdfRender.template}
          ctx={pdfRender.ctx}
          root={pdfRender.root}
        />
      )}

      <fieldset className="contact-mail-attachments" disabled={disabled}>
        <legend>Pièces jointes</legend>

        <div className="contact-mail-attach-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={disabled || generatingPdf || loadingFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            {loadingFiles ? 'Lecture du fichier…' : 'Ajouter un fichier'}
          </button>
          {fileError && <p className="form-error">{fileError}</p>}
          <span className="hint contact-mail-attach-size">
            {attachments.length
              ? `${attachments.length} fichier(s) — ${formatAttachmentSize(totalBytes)}`
              : `Max. ${formatAttachmentSize(MAX_MAIL_ATTACHMENTS_BYTES)}`}
            {nearLimit && ' — proche de la limite Gmail'}
          </span>
        </div>

        {attachments.length > 0 && (
          <ul className="contact-mail-attach-list">
            {attachments.map((att) => (
              <li key={att.id}>
                <span>
                  {att.filename}
                  <span className="meta">
                    {' '}
                    — {formatAttachmentSize(att.blob.size)}
                    {att.source === 'pdf' ? ' (PDF généré)' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={disabled}
                  onClick={() => removeAttachment(att.id)}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}

        <details className="contact-mail-pdf-panel">
          <summary>Joindre un catalogue PDF (modèle Atelier OS)</summary>
          <div className="contact-mail-pdf-fields">
            <label>
              Modèle PDF
              <select
                value={pdfTemplateId}
                onChange={(e) => setPdfTemplateId(e.target.value)}
                disabled={disabled || generatingPdf}
              >
                <option value="">— Choisir un modèle —</option>
                {templates?.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.nom}
                  </option>
                ))}
              </select>
            </label>

            <p className="hint">Œuvres à inclure dans le PDF :</p>
            <div className="contact-mail-work-picks">
              {works?.length ? (
                works.map((work) => (
                  <label key={work.id} className="contact-mail-work-pick">
                    <input
                      type="checkbox"
                      checked={selectedWorkIds.has(work.id)}
                      disabled={disabled || generatingPdf}
                      onChange={() => toggleWork(work.id)}
                    />
                    <span>
                      {work.ref} — {work.titre}
                    </span>
                  </label>
                ))
              ) : (
                <p className="hint">Aucune œuvre en base.</p>
              )}
            </div>

            {pdfError && <p className="form-error">{pdfError}</p>}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || generatingPdf || !pdfTemplateId || selectedWorkIds.size === 0}
              onClick={() => void addPdfCatalogue()}
            >
              {generatingPdf ? 'Génération du PDF…' : 'Générer et joindre le PDF'}
            </button>
          </div>
        </details>
      </fieldset>
    </>
  );
}
