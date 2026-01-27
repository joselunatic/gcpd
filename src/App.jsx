import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import './App.css'
import './css/UpdateBanner.styles.css'
import IMSAI from './components/IMSAI'
import UpdateBanner from './components/UpdateBanner'
import DmPanel from './components/DmPanel'

const TerminalShell = () => {
  useEffect(()=>{
    console.log('Render terminal shell');
  }, [])

  return (
    <div className="pc-container">
        <UpdateBanner />
        <IMSAI />
    </div>
  )
}

const App = () => {  
  useEffect(()=>{
    console.log('Render APP');
  }, [])

  return (
    <Routes>
      <Route path="/dm" element={<DmPanel />} />
      <Route path="/*" element={<TerminalShell />} />
    </Routes>
  )
}

export default App
