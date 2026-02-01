import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import '../../css/Base.styles.css'

const Base = ({on, setOn, setReset }) => {  

    const navigate = useNavigate();

    const RIGHT_SWITCH = {
        EXAMINE: 0,
        DEPOSIT: 1,
        RESET: 2,
        RUN: 3,
        SINGLE_STEP: 4,
        POWER: 5,
    };
    const LEFT_SWITCH = {
        THEME: 0,
        NAV: 6,
    };

    const resetTerminalToBoot = () => {
        localStorage.removeItem("screenStatus");
        localStorage.removeItem("terminalState");
        sessionStorage.removeItem("screenStatus");
        sessionStorage.removeItem("terminalState");
        sessionStorage.removeItem("terminalSnapshot");
        setOn('off');
        setTimeout(function(){
            setOn('on');
            const randomNumber = Math.floor(Math.random() * 1000);
            setReset(randomNumber.toString());
        }, 300);
    };

    const refocusTerminalInput = () => {
        if (document.body.classList.contains('touch-mode')) return;
        const modal = document.getElementById("myModal");
        if (modal && modal.style.display === "block") return;
        const input = document.querySelector("#input[contenteditable='true']");
        if (input) input.focus();
    };

    const handleSwitch = (event) => {
        console.log(event);
        // Switch 'PWR ON/OFF'. Turn monitor on and off
        if (event.target.classList.contains('right-part')) {
            console.log('Right button block: ', event.target.id);
            // Power is the bottom switch (PWR ON/OFF) per visual order.
            if (event.target.id === String(RIGHT_SWITCH.POWER)) {
                const powerStatus = event.target.checked ? 'on' : 'off';
                const indicatorLeftDown = document.getElementsByClassName('indicator middle left-part')[3];
                indicatorLeftDown.classList.remove('passive');
                setOn(powerStatus);
            }
            // Switch 'RESET, EXT. CLR'. Reset the login status of the terminal that is stored in local storage. Begin from scratch
            if (event.target.id === String(RIGHT_SWITCH.RESET)) {
                localStorage.removeItem("screenStatus");
                setOn('off');
                setTimeout(function(){
                    event.target.checked = !event.target.checked;
                    setOn('on');
                    const randomNumber = Math.floor(Math.random() * 1000);
                    setReset(randomNumber.toString());
                }, 300);
                setTimeout(function(){
                    //window.alert("The terminal login status has been reset. You can begin completely from scratch. Good luck!");
                    // When the user clicks on the button, open the modal
                    var modal = document.getElementById("myModal");
                    modal.style.display = "block";
                }, 3000);   
            }
            if (event.target.id === String(RIGHT_SWITCH.EXAMINE)) {
                setTimeout(function(){
                    event.target.checked = !event.target.checked;
                }, 300);
            }
            // This behavior belongs to the RUN/STOP switch per visual order.
            if (event.target.id === String(RIGHT_SWITCH.RUN)) {
                // Full reset to boot state (dialer/login) on any toggle.
                resetTerminalToBoot();
                const switchMid01 = document.getElementsByClassName('mid-part 2')[0];
                const switchMid02 = document.getElementsByClassName('mid-part 5')[0];
                console.log(switchMid01);
                switchMid01.checked = false;
                switchMid02.checked = !switchMid02.checked;
                const indicatorLeftDown = document.getElementsByClassName('indicator down left-part')[3];
                console.log(indicatorLeftDown)
                indicatorLeftDown.classList.remove('passive');
            }
        }
        if (event.target.classList.contains('left-part')) {
            console.log('Left button block: ', event.target.id);
            if (event.target.id === String(LEFT_SWITCH.THEME)) {
                // Leftmost switch toggles terminal color (blue default, green when on).
                const palette = event.target.checked ? 'green' : 'blue';
                if (window.setTuiPalette) {
                    window.setTuiPalette(palette);
                } else {
                    try {
                        localStorage.setItem('tuiPalette', palette);
                    } catch (e) {}
                    const terminalContainer = document.getElementById('terminal-container');
                    if (terminalContainer) {
                        terminalContainer.classList.toggle(
                            'terminal-theme--green',
                            event.target.checked
                        );
                    }
                    window.dispatchEvent(
                        new CustomEvent('wopr-theme-change', { detail: { palette } })
                    );
                }
            }
            if (event.target.id === String(LEFT_SWITCH.NAV)) {
                const switchLeft01 = document.getElementsByClassName('left-part 0')[0];
                console.log(switchLeft01);
                

                let allSet = true;
                const indicatorLeft = Array.from(document.getElementsByClassName('indicator left-part'));
                indicatorLeft.forEach((indicator) => {
                    //console.log(indicator);
                    if (indicator.classList.contains('passive')) allSet = false;
                });
                const switchesLeft = Array.from(document.getElementsByClassName('checkbox left-part'));
                //console.log(switchesLeft);
                switchesLeft.forEach((switches) => {
                    if (!switches.checked) allSet = false;
                })
                console.log('all set');
                if (!allSet) {
                    switchLeft01.checked = !switchLeft01.checked;
                    const indicatorLeftDown = document.getElementsByClassName('indicator down left-part')[4];
                    indicatorLeftDown.classList.remove('passive');
                    setTimeout(function(){
                        event.target.checked = !event.target.checked;
                    }, 300);
                } else {
                    navigate('/pacman')
                }
            }
        }
        if (event.target.classList.contains('mid-part')) {
            console.log('Middle button block: ', event.target.id);
            if (event.target.id === '2') {
                const switchLeft07 = document.getElementsByClassName('left-part 7')[0];
                switchLeft07.checked = false
            }
            if (event.target.id === '1') {
                const indicatorLeftUp = document.getElementsByClassName('indicator up left-part')[0];
                const indicatorLeftDown = document.getElementsByClassName('indicator down left-part')[0];
                if (indicatorLeftUp.classList.contains('passive')) {
                    indicatorLeftUp.classList.remove('passive');
                } else {
                    indicatorLeftUp.classList.add('passive');
                }
                if (indicatorLeftDown.classList.contains('passive')) {
                    indicatorLeftDown.classList.remove('passive');
                } else {
                    indicatorLeftDown.classList.add('passive');
                }
            }
            if (event.target.id === '0') {
                const indicatorLeftDown = document.getElementsByClassName('indicator down left-part')[6];
                if (indicatorLeftDown.classList.contains('passive')) {
                    indicatorLeftDown.classList.remove('passive');
                } else {
                    indicatorLeftDown.classList.add('passive');
                }
            }
            if (event.target.id === '4') {
                const indicatorMid1 = document.getElementsByClassName('indicator middle left-part')[1];
                const indicatorMid2 = document.getElementsByClassName('indicator middle left-part')[4];
                if (indicatorMid1.classList.contains('passive')) {
                    indicatorMid1.classList.remove('passive');
                } else {
                    indicatorMid1.classList.add('passive');
                }
                if (indicatorMid2.classList.contains('passive')) {
                    indicatorMid2.classList.remove('passive');
                } else {
                    indicatorMid2.classList.add('passive');
                }
            }
            if (event.target.id === '5') {
                const indicatorMid1 = document.getElementsByClassName('indicator middle left-part')[7];
                const indicatorMid2 = document.getElementsByClassName('indicator middle left-part')[5];
                if (indicatorMid1.classList.contains('passive')) {
                    indicatorMid1.classList.remove('passive');
                } else {
                    indicatorMid1.classList.add('passive');
                }
                if (indicatorMid2.classList.contains('passive')) {
                    indicatorMid2.classList.remove('passive');
                } else {
                    indicatorMid2.classList.add('passive');
                }
                const switchLeft01 = document.getElementsByClassName('left-part 1')[0];
                const switchLeft02 = document.getElementsByClassName('left-part 1')[4];
                switchLeft01.checked = !switchLeft01.checked;
                switchLeft02.checked = false;
            }
            if (event.target.id === '7') {
                const indicatorMid1 = document.getElementsByClassName('indicator up left-part')[5];
                const indicatorMid2 = document.getElementsByClassName('indicator down left-part')[7];
                const indicatorMid3 = document.getElementsByClassName('indicator down left-part')[2];
                if (indicatorMid1.classList.contains('passive')) {
                    indicatorMid1.classList.remove('passive');
                } else {
                    indicatorMid1.classList.add('passive');
                }
                if (indicatorMid2.classList.contains('passive')) {
                    indicatorMid2.classList.remove('passive');
                } else {
                    indicatorMid2.classList.add('passive');
                }
                indicatorMid3.classList.remove('passive');
            }
        }
        refocusTerminalInput();
    }

    const textsBlock3 = (texts) => {
        return texts.map((text, index) => 
         ( <div key={index} className='text-item-container-3'> 
                <div  className="text-item-3">{text}</div>
            </div> 
         )
        )
    }
    const eightTextsBlock = (texts) => {
        return texts.map((text, index) => 
         (
            <div key={index} className="text-item">{text}</div>
         )
        )
    }
    const eightButtonBlockLeft = Array.from({length: 8}, (_, index) => {
        const defaultChecked = [1, 5, 7].includes(index, 0);
        const passiveUp = [0, 5].includes(index, 0);
        const passiveMiddle = [1, 3, 4, 5, 7].includes(index, 0);
        const passiveDown = [0, 2, 3, 4, 6, 7].includes(index, 0);
        return (
            <label key={index}  className='checkboxControl left-part'>
                <input type='checkbox' defaultChecked={defaultChecked} onClick={handleSwitch} id={index} className={`checkbox left-part ${index}`}/>
                <div className={index < 4 ? 'blue-button' : 'red-button'}></div>
                <span className={`indicator up left-part ${passiveUp?'passive':''}`}></span>
                <span className={`indicator middle left-part ${passiveMiddle?'passive':''}`}></span>
                <span className={`indicator down left-part ${passiveDown?'passive':''}`}></span>
            </label>
        );
      });

    const eightButtonBlockMiddle = Array.from({length: 8}, (_, index) => {
        const defaultChecked = [0, 1, 5].includes(index, 0);
        const passiveMiddle = [2, 4, 5].includes(index, 0);
        const passiveDown = [0, 1, 3, 7].includes(index, 0);
        return (
            <label key={index}  className='checkboxControl mid-part'>
                <input type='checkbox' defaultChecked={defaultChecked} onClick={handleSwitch} id={index} className={`checkbox mid-part ${index}`}/>
                <div className={index < 4 ? 'blue-button' : 'red-button'}></div>
                <span className={`indicator middle ${passiveMiddle?'passive':''}`}></span>
                <span className={`indicator down ${passiveDown?'passive':''}`}></span>
            </label>
        );
      }); 

    const sixButtonBlock = Array.from({length: 6}, (_, index) => {
        let defaultChecked = [RIGHT_SWITCH.POWER].includes(index, 0);
        const passiveDown = [0, 1, 4, 5].includes(index, 0);
        defaultChecked = (index === RIGHT_SWITCH.POWER) ? (on ==='on' ? true : false ) : defaultChecked; 
        return (
            <label key={index}  className='checkboxControl right-part'>
                <input type='checkbox' defaultChecked={defaultChecked} onClick={handleSwitch} id={index} className='checkbox right-part'/>
                <div className={(index % 2 == 0) ? 'blue-button' : 'red-button'}></div>
                <span className={`indicator down ${passiveDown?'passive':''}`}></span>
            </label>
        );
      });

      useEffect(()=>{
        // Get the modal
        var modal = document.getElementById("myModal");
        // Get the <span> element that closes the modal
        var span = document.getElementsByClassName("close")[0];
        // When the user clicks on <span> (x), close the modal
        span.onclick = function() {
            modal.style.display = "none";
        }
        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
        // Sync terminal theme with the leftmost switch default state.
        const leftThemeSwitch = document.getElementsByClassName('left-part 0')[0];
        if (leftThemeSwitch) {
            const palette = leftThemeSwitch.checked ? 'green' : 'blue';
            if (window.setTuiPalette) {
                window.setTuiPalette(palette);
            } else {
                try {
                    localStorage.setItem('tuiPalette', palette);
                } catch (e) {}
                const terminalContainer = document.getElementById('terminal-container');
                if (terminalContainer) {
                    terminalContainer.classList.toggle(
                        'terminal-theme--green',
                        leftThemeSwitch.checked
                    );
                }
                window.dispatchEvent(
                    new CustomEvent('wopr-theme-change', { detail: { palette } })
                );
            }
        }
      }, []);

    return (
      <div className={`cpu ${on === 'on' ? 'power-on' : 'power-off'}`}>
        <div className='cpu-base'>
            <div className='upper-base'>
                <div className='upper-section-1'>
                    <div className='upper-section-block'>
                        <div className='text-container'>
                            {eightTextsBlock(['7', '6', '5', '4', '3', '2', '1', '0'])}
                        </div>
                        <div className='text-container'>
                            {eightTextsBlock(['MEMR', 'INP', 'M1', 'OUT', 'HLTA', 'STACK', 'WO', 'INTA'])}
                        </div>
                    </div>
                    <div className='upper-section-block'>
                        <div className='text-container'>
                            {eightTextsBlock(['8', '4', '2', '1', '8', '4', '2', '1'])}
                        </div>
                        <div className="innerline"></div>
                        <div className='text-container'>
                            {eightTextsBlock(['2', '1', '4', '2', '1', '4', '2', '1'])}
                        </div>
                    </div>
                    <div className='upper-section-block'>
                        <div className='text-container'>
                            {eightTextsBlock(['15', '14', '13', '12', '11', '10', '9', '8'])}
                        </div>
                        <div className="innerline"></div>
                        <div className='text-container'>
                            {eightTextsBlock(['7', '6', '5', '4', '3', '2', '1', '0'])}
                        </div>
                        <div className='text-container'>
                            ADDRESS-PROGRAMMED INPUT
                        </div>
                    </div>
                </div>
                <div className='upper-section-2'>
                    <div className='upper-section-block'>
                        <div className='text-container'>
                            {eightTextsBlock([' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '])}
                        </div>
                        <div className='text-container'>
                            {eightTextsBlock(['7', '6', '5', '4', '3', '2', '1', '0'])}
                        </div>
                    </div>
                    <div className='upper-section-block'>
                        <div className='text-container'>
                            {eightTextsBlock(['8', '4', '2', '1', '8', '4', '2', '1'])}
                        </div>
                        <div className="innerline"></div>
                        <div className='text-container'>
                            {eightTextsBlock(['2', '1', '4', '2', '1', '4', '2', '1'])}
                        </div>
                    </div>
                    <div className='upper-section-block'>
                        <div className='text-container'>
                            {eightTextsBlock(['7', '6', '5', '4', '3', '2', '1', '0'])}
                        </div>
                        <div className='text-container'>
                            {eightTextsBlock([' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '])}
                        </div>
                        <div className="innerline-empty"></div>
                        <div className='text-container'>
                            ADDRESS-DATA
                        </div>
                    </div>
                </div>
                <div className='upper-section-3'>
                    <div className='upper-section-block-3'>
                        <div className='title-container'>
                            <div className='imsai-title'>WAYNE INDUSTRIES</div>
                            <p>---------------------- AUXILIARY NODE INTERFACE</p>
                        </div>
                    </div>
                    <div className='upper-section-block-3'>
                        <div className='text-container-ext'>
                            {eightTextsBlock([' ', ' ', ' ', ' ', ' ', ' '])}
                        </div>
                        <div className='text-container-ext'>
                            {eightTextsBlock([' ', ' ', 'INTERR. ENABLD', 'RUN', 'WAIT', 'HOLD'])}
                        </div>
                    </div>
                    <div className='upper-section-block-3'>
                        <div className='text-container-ext'>
                        {textsBlock3(['EXAMINE', 'DEPOSIT', 'RESET', 'RUN', 'SINGLE STEP', 'PWR ON'])}
                        </div>
                        <div className="innerline-3"></div>
                        <div className='text-container-ext'>
                            {eightTextsBlock(['EXAMINE NEXT', 'DEPOSIT NEXT', 'EXT. CLR', 'STOP', 'SINGLE STEP', 'PWR OFF'])}
                        </div>
                        <div className='text-container'>
                            
                        </div>
                    </div>
                </div>
            </div>
            <div className='lower-base'>
                <div className='buttons-section'>
                    <div className='buttons-container left-part'>
                        {eightButtonBlockLeft}
                    </div>
                </div>
                <div className='buttons-section'>
                    <div className='buttons-container mid-part'>
                        {eightButtonBlockMiddle}
                    </div>
                </div>
                <div className='buttons-section'>
                    <div className='buttons-container-3 right-part'>
                        {sixButtonBlock}
                    </div>
                </div>
            </div>
        </div>
        <div className='disquette-base'>
            <div className='title-container-disc'>
                <div className='imsai-title-disc'>BROTHER EYE MK.0</div>
            </div>
            <div className="disquette">
                <div className="disqueteline"></div>
                <div className="disquetesquare"></div> 
            </div>
            <div className="disquette">
                <div className="disqueteline"></div>                    
                <div className="disquetesquare"></div> 
            </div>
        </div>
        <div id="myModal" className="modal">
            <div className="modal-content">
                <span className="close">&times;</span>
                <p>The terminal login status has been reset. You can begin completely from scratch. Good luck!</p>
            </div>
        </div>
      </div>
    )
  }

  export default Base;
