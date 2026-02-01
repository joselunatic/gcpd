import { useMemo } from 'react'
import { marked } from 'marked'

import '../css/DocsPage.styles.css'
import dmSchemaDoc from '../../docs/dm-db-esquema.md?raw'

const DocsPage = () => {
  const html = useMemo(() => {
    return marked.parse(dmSchemaDoc, {
      mangle: false,
      headerIds: false,
    })
  }, [])

  return (
    <div className="docs-page">
      <header className="docs-page__hero">
        <div className="docs-page__hero-inner">
          <p className="docs-page__eyebrow">WOPRCRT / DM</p>
          <h1>Docs: esquema de base de datos</h1>
          <p className="docs-page__lede">
            Resumen simple y organizado para consultar los campos de casos, POIs y villanos.
          </p>
        </div>
      </header>

      <main className="docs-page__content">
        <article
          className="docs-page__card"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  )
}

export default DocsPage
