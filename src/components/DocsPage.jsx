import { useMemo } from 'react'
import { marked } from 'marked'

import '../css/DocsPage.styles.css'
import dmGuideDoc from '../../docs/dm-guide.md?raw'
import dmPanelOpsDoc from '../../docs/dm-panel-operativa.md?raw'
import dmSchemaDoc from '../../docs/dm-db-esquema.md?raw'

const DOC_SECTIONS = [
  {
    id: 'panel',
    eyebrow: 'MANUAL',
    title: 'Operativa del panel DM',
    summary:
      'Guia extensa del panel con capturas reales, menus, opciones y relacion con el frontend de agentes.',
    markdown: dmPanelOpsDoc,
  },
  {
    id: 'guide',
    eyebrow: 'OPERACION',
    title: 'Guia del DM',
    summary: 'Que hace cada vista, flujo recomendado y reglas practicas para operar la campaña.',
    markdown: dmGuideDoc,
  },
  {
    id: 'schema',
    eyebrow: 'REFERENCIA',
    title: 'Esquema de datos',
    summary: 'Resumen de campos de casos, POIs y villanos para consulta rapida.',
    markdown: dmSchemaDoc,
  },
]

const DocsPage = () => {
  const docs = useMemo(() => {
    return DOC_SECTIONS.map((section) => ({
      ...section,
      html: marked.parse(section.markdown, {
        mangle: false,
        headerIds: false,
      }),
    }))
  }, [])

  return (
    <div className="docs-page">
      <header className="docs-page__hero">
        <div className="docs-page__hero-inner">
          <p className="docs-page__eyebrow">WOPRCRT / DM</p>
          <h1>Ayuda y documentacion del DM</h1>
          <p className="docs-page__lede">
            Guia operativa para el panel del DM y referencia rapida del modelo de datos. Pensada
            para trabajar sin tener que inspeccionar el codigo.
          </p>
          <nav className="docs-page__quicknav" aria-label="Secciones de ayuda">
            {docs.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="docs-page__quicklink">
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="docs-page__content">
        <section className="docs-page__overview">
          {docs.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="docs-page__summary-card">
              <p className="docs-page__summary-eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
            </a>
          ))}
        </section>

        {docs.map((section) => (
          <article key={section.id} id={section.id} className="docs-page__card">
            <div className="docs-page__section-head">
              <p className="docs-page__summary-eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
            </div>
            <div dangerouslySetInnerHTML={{ __html: section.html }} />
          </article>
        ))}
      </main>
    </div>
  )
}

export default DocsPage
