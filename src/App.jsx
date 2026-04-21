import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'

import './App.css'
import './css/UpdateBanner.styles.css'
import IMSAI from './components/IMSAI'
import UpdateBanner from './components/UpdateBanner'
import DmPanel from './components/DmPanel'
import DocsPage from './components/DocsPage'
import PhonePanel from './components/PhonePanel'

const QuestRoute = lazy(() => import('./quest/QuestRoute'))

const TerminalShell = () => {
  const isDevFast =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_DEV_MODE === "1";
  const [bootActive, setBootActive] = useState(!isDevFast);

  const handleBootDone = useCallback(() => {
    setBootActive(false);
  }, []);

  useEffect(()=>{
    console.log('[App]', new Date().toISOString(), 'Render terminal shell');
  }, [])

  return (
    <div className="pc-container">
        <UpdateBanner />
        <IMSAI bootActive={bootActive} onBootDone={handleBootDone} />
    </div>
  )
}

const App = () => {  
  useEffect(()=>{
    console.log('[App]', new Date().toISOString(), 'Render APP');
  }, [])

  return (
    <Routes>
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/dm" element={<DmPanel />} />
      <Route path="/phone" element={<PhonePanel />} />
      <Route
        path="/quest/*"
        element={
          <Suspense fallback={<div className="pc-container" />}>
            <QuestRoute />
          </Suspense>
        }
      />
      <Route path="/*" element={<TerminalShell />} />
    </Routes>
  )
}

export default App
