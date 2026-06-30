import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { TemplatePdfRender } from '../components/editor/TemplatePdfRender';
import { PageHeader } from '../components/PageHeader';
import {
  getExhibitionWithWorks,
  useAllTemplates,
  useArtistMap,
  useArtists,
  useExhibitions,
  useWorks,
} from '../hooks/useDatabase';
import { isBuiltinTemplate } from '../utils/templateCatalog';
import type { DocBlock, DocTemplate } from '../types/templates';
import type { Work } from '../types';
import { generateTemplateDocument } from '../utils/templatePdf';
import { countExpandedPdfPages } from '../utils/templatePages';
import type { TemplateContext } from '../utils/templateFields';
import { enrichTemplateContexts } from '../utils/templateMediaContext';

export function GeneratePage() {
  const works = useWorks();
  const artists = useArtists();
  const exhibitions = useExhibitions();
  const templates = useAllTemplates();
  const artistMap = useArtistMap(artists);
  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
  const [selectedExpo, setSelectedExpo] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState('');
  const [pdfRender, setPdfRender] = useState<{
    template: DocTemplate;
    ctx: TemplateContext;
    root?: DocBlock;
  } | null>(null);

  const toggleWork = (id: string) => {
    const next = new Set(selectedWorks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWorks(next);
  };

  const getSelectedWorkObjects = (): Work[] => works?.filter((w) => selectedWorks.has(w.id)) ?? [];

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
  const expandedPageCount =
    selectedTemplate && selectedWorks.size > 0
      ? countExpandedPdfPages(selectedTemplate, selectedWorks.size)
      : 0;

  const run = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur génération PDF');
    } finally {
      setLoading('');
      setPdfRender(null);
    }
  };

  const renderPage = async (template: DocTemplate, root: DocBlock, ctx: TemplateContext) => {
    flushSync(() => setPdfRender({ template, ctx, root }));
  };

  const generateWithTemplate = async () => {
    const tpl = selectedTemplate;
    const selected = getSelectedWorkObjects();
    if (!tpl) {
      alert('Sélectionnez un modèle.');
      return;
    }
    if (!selected.length) {
      alert('Sélectionnez au moins une œuvre.');
      return;
    }

    const isExpoType = tpl.type === 'presse' || tpl.type === 'catalogue_page';
    const expo = isExpoType ? exhibitions?.find((e) => e.id === selectedExpo) : undefined;
    if (isExpoType && !expo) {
      alert('Sélectionnez une exposition pour ce type de modèle.');
      return;
    }

    await run('modele', async () => {
      const contexts = await enrichTemplateContexts(
        selected.map((work) => ({
          work,
          artist: artistMap.get(work.artisteId),
          exhibition: expo,
        })),
      );

      await generateTemplateDocument(
        tpl,
        contexts,
        `${tpl.nom.replace(/\s+/g, '-').toLowerCase()}-${selected.length}oeuvres.pdf`,
        undefined,
        undefined,
        async (root, ctx) => {
          await renderPage(tpl, root, ctx);
        },
      );
    });
  };

  const generateExpoCatalogue = async () => {
    const tpl = templates?.find((t) => t.id === 'builtin_catalogue') ?? templates?.find((t) => t.type === 'catalogue_page');
    const expo = exhibitions?.find((e) => e.id === selectedExpo);
    if (!tpl || !expo) {
      alert('Modèle catalogue ou exposition manquant.');
      return;
    }
    const { works: expoWorks, artist } = await getExhibitionWithWorks(expo);
    if (!expoWorks.length) {
      alert('Aucune œuvre liée à cette exposition.');
      return;
    }

    await run('Catalogue', async () => {
      const contexts = await enrichTemplateContexts(
        expoWorks.map((work) => ({
          work,
          artist,
          exhibition: expo,
        })),
      );
      await generateTemplateDocument(
        tpl,
        contexts,
        `catalogue-${expo.titre.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        undefined,
        undefined,
        async (root, ctx) => renderPage(tpl, root, ctx),
      );
    });
  };

  const generateExpoPresse = async () => {
    const tpl = templates?.find((t) => t.id === 'builtin_presse') ?? templates?.find((t) => t.type === 'presse');
    const expo = exhibitions?.find((e) => e.id === selectedExpo);
    if (!tpl || !expo) {
      alert('Modèle presse ou exposition manquant.');
      return;
    }
    const { works: expoWorks, artist } = await getExhibitionWithWorks(expo);
    const work = expoWorks[0];
    const ctx: TemplateContext = { work, artist, exhibition: expo };

    await run('Presse', async () => {
      const [enriched] = await enrichTemplateContexts([ctx]);
      await generateTemplateDocument(
        tpl,
        [enriched],
        `presse-${expo.titre.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        undefined,
        undefined,
        async (root, c) => renderPage(tpl, root, c),
      );
    });
  };

  const customTemplates = templates?.filter((t) => !isBuiltinTemplate(t)) ?? [];
  const allTemplatesList = templates ?? [];

  return (
    <>
      <PageHeader
        title="Générer"
        subtitle="Cartels, certificats, catalogues — via vos modèles de mise en page"
        action={
          <Link to="/editeur" className="btn btn-secondary btn-sm">
            Éditeur de modèles
          </Link>
        }
      />

      <div className="generate-layout">
        <section className="card-section info-card">
          <h2>Par œuvre (modèles)</h2>
          <p className="hint">
            Modèles par défaut (cartel, fiche, certificat…) et modèles personnalisés. Créez les vôtres dans l'
            <Link to="/editeur">éditeur de modèles</Link>.
          </p>
          <label>
            Modèle
            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
              <option value="">— Choisir un modèle —</option>
              <optgroup label="Par défaut">
                {allTemplatesList.filter((t) => isBuiltinTemplate(t)).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} — {t.format.toUpperCase()}
                  </option>
                ))}
              </optgroup>
              {customTemplates.length > 0 && (
                <optgroup label="Personnalisés">
                  {customTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} — {t.format.toUpperCase()}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {(selectedTemplate?.type === 'presse' || selectedTemplate?.type === 'catalogue_page') && (
            <label>
              Exposition
              <select value={selectedExpo} onChange={(e) => setSelectedExpo(e.target.value)}>
                <option value="">— Choisir —</option>
                {exhibitions?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="work-select-list">
            {works?.map((work) => (
              <label key={work.id} className="work-select-item">
                <input
                  type="checkbox"
                  checked={selectedWorks.has(work.id)}
                  onChange={() => toggleWork(work.id)}
                />
                <span>
                  <strong>{work.titre}</strong>
                  <small>{work.ref} — {artistMap.get(work.artisteId)?.nom}</small>
                </span>
              </label>
            ))}
            {!works?.length && <p className="hint">Aucune œuvre disponible.</p>}
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedTemplateId || selectedWorks.size === 0 || !!loading}
              onClick={generateWithTemplate}
            >
              {loading === 'modele'
                ? '…'
                : `Générer PDF (${selectedWorks.size} œuvre(s)${expandedPageCount > selectedWorks.size ? `, ${expandedPageCount} p.` : ''})`}
            </button>
          </div>
        </section>

        <section className="card-section">
          <h2>Par exposition</h2>
          <p className="hint">Catalogue (une page par œuvre) ou dossier de presse.</p>

          <label>
            Exposition
            <select value={selectedExpo} onChange={(e) => setSelectedExpo(e.target.value)}>
              <option value="">— Choisir —</option>
              {exhibitions?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titre}
                </option>
              ))}
            </select>
          </label>

          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedExpo || !!loading}
              onClick={generateExpoCatalogue}
            >
              {loading === 'Catalogue' ? '…' : 'Catalogue PDF (pages œuvres)'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!selectedExpo || !!loading}
              onClick={generateExpoPresse}
            >
              {loading === 'Presse' ? '…' : 'Dossier de presse'}
            </button>
          </div>
        </section>
      </div>

      {pdfRender && (
        <TemplatePdfRender template={pdfRender.template} ctx={pdfRender.ctx} root={pdfRender.root} />
      )}
    </>
  );
}
