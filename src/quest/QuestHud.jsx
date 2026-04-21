const QuestHud = ({ data, navigation }) => {
  return (
    <div className="quest-hud">
      <div className="quest-hud__card">
        <span className="quest-hud__eyebrow">BROTHER-MK0 / QUEST VARIANT</span>
        <h1>Spatial agent console prototype</h1>
        <p>
          This route is isolated from the legacy IMSAI shell. It reuses campaign
          data, but replaces keyboard-first terminal interaction with panel
          navigation suitable for Meta Quest Browser.
        </p>
        <div className="quest-hud__stats">
          <span>cases {data.cases.length}</span>
          <span>pois {data.pois.length}</span>
          <span>villains {data.villains.length}</span>
        </div>
        <div className="quest-hud__nav">
          <button type="button" onClick={navigation.goHome}>
            Home
          </button>
          <button type="button" onClick={navigation.openCases}>
            Cases
          </button>
          <button type="button" onClick={navigation.openPois}>
            POIs
          </button>
          <button type="button" onClick={navigation.openVillains}>
            Villains
          </button>
          <button type="button" onClick={navigation.goBack}>
            Back
          </button>
        </div>
        {data.error ? (
          <p className="quest-hud__status quest-hud__status--error">
            api fallback active: {data.error}
          </p>
        ) : (
          <p className="quest-hud__status">
            {data.loading ? 'loading spatial dataset...' : 'dataset online'}
          </p>
        )}
      </div>
    </div>
  );
};

export default QuestHud;
