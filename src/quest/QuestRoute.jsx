import { useState } from 'react';

import './styles/quest.css';

import QuestCanvas from './QuestCanvas';
import QuestHud from './QuestHud';
import QuestSessionControls from './QuestSessionControls';
import { useQuestData } from './hooks/useQuestData';
import { useQuestNavigation } from './hooks/useQuestNavigation';

const QuestRoute = () => {
  const data = useQuestData();
  const navigation = useQuestNavigation();
  const [recenterKey, setRecenterKey] = useState(0);

  const handleRecenter = () => {
    setRecenterKey((value) => value + 1);
  };

  return (
    <div className="quest-route">
      <QuestCanvas
        data={data}
        navigation={navigation}
        recenterKey={recenterKey}
      />
      <QuestSessionControls onRecenter={handleRecenter} />
      <QuestHud data={data} navigation={navigation} />
    </div>
  );
};

export default QuestRoute;
