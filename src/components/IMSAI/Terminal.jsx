import { useEffect, useRef } from 'react';

import '../../css/Terminal.styles.css'
import '../../js/terminal.js'
import { loadingTerminal } from '../../js/terminal.js';


// import { memo } from 'react';

const Terminal = ({ reset, on, bootReady = true }) => {

    const ref = useRef(true);
    const loadTerminalOn = useRef(false);
    const loadTerminalReset = useRef(false);
    const hasBooted = useRef(false);

    useEffect(() => {
        console.log('[Terminal]', new Date().toISOString(), 'Main use effect');
        const firstRender = ref.current;
        console.log('[Terminal]', new Date().toISOString(), 'Ref: ', ref.current);
        if (firstRender) {
          ref.current = false;
          console.log('[Terminal]', new Date().toISOString(), 'First Render');
          if (bootReady && !hasBooted.current) {
            console.log('[Terminal]', new Date().toISOString(), 'Terminal loading, main...');
            loadingTerminal();
            hasBooted.current = true;
          }
        } else {
          console.log('[Terminal]', new Date().toISOString(), 'Not a first Render');
          loadTerminalOn.current = true;
          loadTerminalReset.current = true;
        }
      }, [])

    useEffect(() => {
        if (!bootReady) return;
        if (hasBooted.current) return;
        console.log('[Terminal]', new Date().toISOString(), 'Terminal boot ready, loading...');
        loadTerminalOn.current = false;
        loadTerminalReset.current = false;
        loadingTerminal();
        hasBooted.current = true;
    }, [bootReady]);
    
    useEffect(() => {
        console.log('[Terminal]', new Date().toISOString(), 'Terminal on, off: ', on);
        console.log('[Terminal]', new Date().toISOString(), 'Ref: ', ref.current);
        if (!hasBooted.current) return;
        if (on==='on') {
            if (loadTerminalOn.current) {
                console.log('[Terminal]', new Date().toISOString(), 'On, loading terminal: ', loadTerminalOn.current);
                if (bootReady) {
                    loadingTerminal();
                    hasBooted.current = true;
                }
                loadTerminalOn.current = false;
            }
        } else {
            const event = new CustomEvent("stopwoprsound");
            window.dispatchEvent(event);
        }
    }, [on, bootReady]);

    useEffect(() => {
        console.log('[Terminal]', new Date().toISOString(), 'Terminal resetting...');
        console.log('[Terminal]', new Date().toISOString(), 'Ref: ', ref.current);
        const event = new CustomEvent("stopwoprsound");
        window.dispatchEvent(event);
        if (!hasBooted.current) return;
        if (loadTerminalReset.current) { 
            console.log('[Terminal]', new Date().toISOString(), 'Reset, loading terminal: ', loadTerminalReset.current);
            if (bootReady) {
                loadingTerminal();
                hasBooted.current = true;
            }
            loadTerminalReset.current = false;
        }
    }, [reset, bootReady]);

    useEffect(() => {
        const container = document.getElementById('terminal-container');
        if (!container) return;
        const refocus = () => {
            if (document.body.classList.contains('touch-mode')) return;
            const input = document.querySelector("#input[contenteditable='true']");
            if (input) input.focus();
        };
        container.addEventListener('mouseup', refocus);
        container.addEventListener('click', refocus);
        return () => {
            container.removeEventListener('mouseup', refocus);
            container.removeEventListener('click', refocus);
        };
    }, []);

    return (
        <div id="terminal-container" >
            <div className='terminal' id='terminal' >
                {/* child components added in javascript */}
            </div>
        </div>
    );
}

export default Terminal;
// export default memo(Terminal);
