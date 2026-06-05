/* Mock campaign data for the DM Panel UI kit. In-world Gotham content. */
window.DM_DATA = {
  session: { agents: 3, expires: '23:14' },
  cases: [
    { id: '079-A', title: 'El Hombre Que Ríe', status: 'active', code: 'KNIGHTFALL-C',
      brief: '> Tres víctimas, idéntica sonrisa post-mortem. Toxina sin identificar. Oracle relay en espera. El terminal recomienda contención inmediata del Distrito Este.',
      tags: ['toxina', 'joker', 'distrito-este'] },
    { id: '044-B', title: 'Carga Fantasma', status: 'active', code: 'BLACKGATE-2',
      brief: '> Contenedor sin manifiesto descargado en muelle 9. Cámaras GCPD comprometidas entre 02:00 y 02:40. Posible vínculo con Falcone.',
      tags: ['contrabando', 'puerto'] },
    { id: '012-C', title: 'La Última Llamada', status: 'resolved', code: 'ORACLE-LOG',
      brief: '> Interceptación de línea cerrada. Sujeto identificado y detenido. Archivo sellado por orden del Comisario.',
      tags: ['escucha', 'resuelto'] },
    { id: '101-A', title: 'Protocolo Espantapájaros', status: 'locked', code: 'FEAR-GAS',
      brief: '> ACCESO RESTRINGIDO. Requiere autorización de nivel 3. Introduzca clave de desbloqueo.',
      tags: ['bloqueado'] },
  ],
  pois: [
    { id: 'ace-chem', name: 'Ace Chemical', district: 'Distrito Este', status: 'active', type: 'crime_scene', mapX: 34, mapY: 30, radius: 1.8, label: 'ACE', summary: '> Planta química abandonada. Escena del crimen #079-A. Acceso por muelle norte sin vigilancia.' },
    { id: 'gcpd-hq', name: 'Jefatura GCPD', district: 'Centro', status: 'active', type: 'operation', mapX: 52, mapY: 48, radius: 1.4, label: 'GCPD', summary: '> Centro de operaciones. Relay 03 alojado en sótano. Bat-señal en azotea (offline).' },
    { id: 'narrows', name: 'The Narrows', district: 'Isla', status: 'active', type: 'territory', mapX: 64, mapY: 66, radius: 2.6, label: 'NARROWS', summary: '> Territorio sin ley. Densidad alta de POIs hostiles. Patrulla GCPD desaconsejada de noche.' },
    { id: 'wayne-t', name: 'Torre Wayne', district: 'Centro', status: 'hidden', type: 'related', mapX: 46, mapY: 22, radius: 1.2, label: '', summary: '> Sede corporativa. Nodo auxiliar Brother-MK0 vinculado. ACCESO RESTRINGIDO.' },
  ],
  villains: [
    { id: 'joker', alias: 'El Joker', realName: '', status: 'Activo', species: 'Humano', age: '~40', height: '1.88m', weight: '75kg', threatLevel: 'Extrema', lastSeen: 'Ace Chemical', summary: '> Psicópata en serie. Toxina facial identificada post-mortem en tres víctimas. Sin alias real confirmado. Patrón: caos sin objetivo aparente.' , patterns: 'Toxinas en escenario\nExposición mediática', knownAssociates: 'Harley Quinn', notes: '' },
    { id: 'scarecrow', alias: 'Espantapájaros', realName: 'Jonathan Crane', status: 'Activo', species: 'Humano', age: '48', height: '1.81m', weight: '67kg', threatLevel: 'Alta', lastSeen: 'The Narrows', summary: '> Antiguo psiquiatra. Gas del miedo documentado. Opera desde The Narrows. Posible vínculo con Protocolo Espantapájaros.' , patterns: 'Gas del miedo\nOpera de noche', knownAssociates: '', notes: 'Conectado con caso 101-A' },
    { id: 'falcone', alias: 'Carmine Falcone', realName: 'Carmine Falcone', status: 'Detenido (provisional)', species: 'Humano', age: '62', height: '1.79m', weight: '95kg', threatLevel: 'Media', lastSeen: 'Jefatura GCPD', summary: '> Cabecilla de la familia Falcone. Detenido en muelle 9. Posible liberación por presión política. Vigilar.' , patterns: 'Corrupción policial\nContrabando portuario', knownAssociates: 'The Roman', notes: 'Ver caso 044-B' },
  ],
  liveTokens: [
    { id: 't1', agentLabel: 'PATRULLA 1', dmLabel: 'GORDON', kind: 'ally', x: 38, y: 52, visible: true },
    { id: 't2', agentLabel: 'PATRULLA 2', dmLabel: 'BULLOCK', kind: 'ally', x: 58, y: 40, visible: true },
    { id: 't3', agentLabel: '???', dmLabel: 'JOKER?', kind: 'enemy', x: 48, y: 28, visible: false },
  ],
  evidence: [
    { id: 'ev_001', label: 'Vial de toxina #1', command: 'TOXIN1', stlPath: '' },
    { id: 'ev_002', label: 'Cuchillo K-07', command: 'KNIFE07', stlPath: '' },
  ],
  audio: [
    { id: 'aud_001', title: 'Mensaje Joker Relay 03', originalSrc: '/uploads/audio/joker_relay.mp3', garbledSrc: '', isGarbled: false, passwordHash: '' },
    { id: 'aud_002', title: 'Llamada anónima — muelle 9', originalSrc: '/uploads/audio/dock9.mp3', garbledSrc: '/uploads/audio/dock9_garbled.mp3', isGarbled: true, passwordHash: '***' },
  ],
  phoneLines: [
    { id: 'line_001', number: '311-399-2364', label: 'GCPD Centralita', audioId: 'aud_001', rellamable: true, llamado: false },
    { id: 'line_002', number: '555-041-0741', label: 'Línea del informante', audioId: 'aud_002', rellamable: false, llamado: true },
  ],
};
