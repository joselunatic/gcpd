import { useCallback, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'

import './App.css'
import './css/UpdateBanner.styles.css'
import IMSAI from './components/IMSAI'
import UpdateBanner from './components/UpdateBanner'
import DmPanel from './components/DmPanel'
import DocsPage from './components/DocsPage'

const TerminalShell = () => {
  const [bootActive, setBootActive] = useState(true);

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
      <Route path="/*" element={<TerminalShell />} />
    </Routes>
  )
}

export default App
