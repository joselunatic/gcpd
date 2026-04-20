import Database from 'better-sqlite3';

const rows = [
  { code: 'NIX', crime: 'Desaparición violenta', location: 'Isla Blackgate', status: 'Activo' },
  { code: 'PBC', crime: 'Agresión múltiple', location: 'Riverwalk', status: 'Activo' },
  { code: 'KAM', crime: 'Ajuste de cuentas', location: 'Ace Chemicals', status: 'Cerrado' },
  { code: 'SAR', crime: 'Ejecución mafiosa', location: 'Little Odessa', status: 'Activo' },
  { code: 'DOM', crime: 'Robo a mano armada', location: 'Financial District', status: 'Cerrado' },
  { code: 'CPV', crime: 'Tráfico de armas', location: 'Westport', status: 'Activo' },
  { code: 'LEV', crime: 'Homicidio ritual', location: 'Cementerio Coventry', status: 'Activo' },
  { code: 'AQN', crime: 'Robo con intimidación', location: 'South Docks', status: 'Activo' },
  { code: 'FAR', crime: 'Homicidio selectivo', location: 'East End', status: 'Activo' },
  { code: 'TNY', crime: 'Desobediencia armada', location: 'Ninth Precinct', status: 'Cerrado' },
  { code: 'GIX', crime: 'Tiroteo entre bandas', location: 'Chinatown', status: 'Cerrado' },
  { code: 'LZW', crime: 'Estafa sofisticada', location: 'Upper Exchange', status: 'Activo' },
  { code: 'AKR', crime: 'Homicidio múltiple', location: 'Distrito Narrows', status: 'Cerrado' },
  { code: 'EKB', crime: 'Secuestro con rescate', location: 'Charity Row', status: 'Activo' },
  { code: 'MAR', crime: 'Tiroteo civil', location: 'Park Row', status: 'Cerrado' },
  { code: 'GPR', crime: 'Disparo indiscriminado', location: 'Market Quarter', status: 'Cerrado' },
  { code: 'POL', crime: 'Intervención policial fallida', location: 'Distrito Otisburg', status: 'Cerrado' },
  { code: 'FJT', crime: 'Asalto organizado', location: 'Steelpier', status: 'Activo' },
  { code: 'EVS', crime: 'Secuestro y fuga', location: 'Midtown', status: 'Activo' },
  { code: 'DLY', crime: 'Violencia doméstica', location: 'Old Mill', status: 'Cerrado' },
  { code: 'REN', crime: 'Homicidio en serie', location: 'Bristol', status: 'Activo' },
  { code: 'BZF', crime: 'Homicidio accidental', location: 'Riverside', status: 'Cerrado' },
  { code: 'BLT', crime: 'Asalto con violencia', location: 'Puerto de Gotham', status: 'Activo' },
  { code: 'HQL', crime: 'Atentado con explosivos', location: 'Harbor Terminal', status: 'Activo' },
  { code: 'TUM', crime: 'Asesinato de testigo protegido', location: 'Burnley', status: 'Activo' },
  { code: 'KSU', crime: 'Robo a banco', location: 'Central Bank Plaza', status: 'Cerrado' },
  { code: 'CEN', crime: 'Ejecución extrajudicial', location: 'Red Hook', status: 'Activo' },
  { code: 'PBD', crime: 'Agresión múltiple', location: 'Riverwalk', status: 'Activo' },
  { code: 'JOR', crime: 'Atentado político', location: 'Ayuntamiento', status: 'Activo' },
];

const calibers = ['9mm','.45 ACP','.40 S&W','.38 SPL','5.56 NATO','7.62x39','.357 MAG','10mm AUTO'];
const materials = ['copper-jacketed','lead core','steel-core','blackened','monel','tungsten','nickel plated','polymer tip'];

const models = rows.map((row, idx) => {
  const assetIndex = (idx % 24) + 1;
  const assetId = `b${String(assetIndex).padStart(2,'0')}`;
  const status = row.status.toUpperCase() === 'CERRADO' ? 'CERRADO' : 'ACTIVO';
  return {
    id: row.code,
    label: row.code,
    assetId,
    pngPath: `/assets/ballistics/${assetId}.png`,
    caliber: calibers[idx % calibers.length],
    material: materials[idx % materials.length],
    bulletId: `BULLET-${String(idx + 1).padStart(2,'0')}`,
    caseId: `gcpd-gc-${String(idx + 1).padStart(3,'0')}`,
    caseCode: row.code,
    crime: row.crime.toUpperCase(),
    location: row.location.toUpperCase(),
    status,
    closedBy: '',
  };
});

const db = new Database('server/batconsole.db');
const stmt = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
);
stmt.run('ballistics_models', JSON.stringify(models));
db.close();
console.log(`Loaded ${models.length} ballistics rows from PDF list.`);
