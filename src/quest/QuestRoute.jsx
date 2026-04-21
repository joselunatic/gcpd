import './styles/quest.css';

import QuestCanvas from './QuestCanvas';
import QuestHud from './QuestHud';
import QuestSessionControls from './QuestSessionControls';

const QuestRoute = () => {
  return (
    <div className="quest-route">
      <QuestCanvas />
      <QuestSessionControls />
      <QuestHud />
    </div>
  );
};

export default QuestRoute;
