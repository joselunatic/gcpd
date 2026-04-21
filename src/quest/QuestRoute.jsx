import './styles/quest.css';

import QuestCanvas from './QuestCanvas';
import QuestHud from './QuestHud';
import QuestSessionControls from './QuestSessionControls';
import { useQuestData } from './hooks/useQuestData';
import { useQuestNavigation } from './hooks/useQuestNavigation';

const QuestRoute = () => {
  const data = useQuestData();
  const navigation = useQuestNavigation();

  return (
    <div className="quest-route">
      <QuestCanvas data={data} navigation={navigation} />
      <QuestSessionControls />
      <QuestHud data={data} navigation={navigation} />
    </div>
  );
};

export default QuestRoute;
