import {
  QUEST_SCREEN_CASE_DETAIL,
  QUEST_SCREEN_CASES,
  QUEST_SCREEN_HOME,
  QUEST_SCREEN_POI_DETAIL,
  QUEST_SCREEN_POIS,
  QUEST_SCREEN_VILLAIN_DETAIL,
  QUEST_SCREEN_VILLAINS,
} from '../state/questScreens';

const summarize = (value, fallback) => {
  const text = String(value || fallback || '').trim();
  if (!text) return fallback;
  return text.length > 86 ? `${text.slice(0, 83)}...` : text;
};

const buildHomeScreen = (navigation) => ({
  title: 'WAYNE AUX NODE / QUEST',
  subtitle: 'Spatial navigation shell for Meta Quest Browser.',
  hint: 'Use pointer selection. Keep the first cut menu-driven and keyboard-free.',
  items: [
    {
      id: 'cases',
      label: 'CASES',
      description: 'Open active case files and narrative summaries.',
    },
    {
      id: 'pois',
      label: 'MAP / POIS',
      description: 'Browse districts, hotspots and field notes.',
    },
    {
      id: 'villains',
      label: 'VILLAINS',
      description: 'Review rogues gallery records and threat posture.',
    },
  ],
  onSelect: (id) => {
    if (id === 'cases') navigation.openCases();
    if (id === 'pois') navigation.openPois();
    if (id === 'villains') navigation.openVillains();
  },
  onBack: null,
  onHome: null,
});

const buildListScreen = ({
  title,
  subtitle,
  items,
  emptyMessage,
  onSelect,
  onBack,
  onHome,
}) => ({
  title,
  subtitle,
  hint: items.length ? 'Select an item to open detail view.' : emptyMessage,
  items,
  onSelect,
  onBack,
  onHome,
});

const buildDetailScreen = ({ title, subtitle, body, onBack, onHome }) => ({
  title,
  subtitle,
  hint: body,
  items: [],
  onSelect: null,
  onBack,
  onHome,
});

const buildQuestScreen = ({ data, navigation }) => {
  if (data.loading) {
    return buildDetailScreen({
      title: 'LOADING QUEST DATA',
      subtitle: 'Fetching campaign state and editorial content.',
      body: 'Waiting for cases, POIs and villains data sources.',
      onBack: navigation.goHome,
      onHome: navigation.goHome,
    });
  }

  if (data.error) {
    return buildDetailScreen({
      title: 'DATA LINK ERROR',
      subtitle: 'Quest route could not load the narrative datasets.',
      body: data.error,
      onBack: navigation.goHome,
      onHome: navigation.goHome,
    });
  }

  switch (navigation.screen) {
    case QUEST_SCREEN_CASES:
      return buildListScreen({
        title: 'CASES',
        subtitle: `${data.cases.length} records available for spatial browsing.`,
        emptyMessage: 'No cases found.',
        items: data.cases.slice(0, 6).map((entry) => ({
          id: entry.id,
          label: entry.title || entry.id || 'UNNAMED CASE',
          description: summarize(entry.summary, 'No summary available.'),
        })),
        onSelect: navigation.openCaseDetail,
        onBack: navigation.goBack,
        onHome: navigation.goHome,
      });
    case QUEST_SCREEN_CASE_DETAIL: {
      const selected = data.cases.find(
        (entry) => String(entry.id) === navigation.selectedId
      );
      return buildDetailScreen({
        title: selected?.title || 'CASE DETAIL',
        subtitle: selected?.id || 'Unknown case id',
        body: summarize(
          selected?.summary || selected?.dm || selected?.status,
          'No case detail available for this record.'
        ),
        onBack: navigation.goBack,
        onHome: navigation.goHome,
      });
    }
    case QUEST_SCREEN_POIS:
      return buildListScreen({
        title: 'MAP / POIS',
        subtitle: `${data.pois.length} locations indexed.`,
        emptyMessage: 'No POIs found.',
        items: data.pois.slice(0, 6).map((entry) => ({
          id: entry.id,
          label: entry.name || entry.id || 'UNKNOWN POI',
          description: summarize(
            entry.summary || entry.district,
            'No field summary available.'
          ),
        })),
        onSelect: navigation.openPoiDetail,
        onBack: navigation.goBack,
        onHome: navigation.goHome,
      });
    case QUEST_SCREEN_POI_DETAIL: {
      const selected = data.pois.find(
        (entry) => String(entry.id) === navigation.selectedId
      );
      return buildDetailScreen({
        title: selected?.name || 'POI DETAIL',
        subtitle: selected?.district || selected?.id || 'Unknown POI',
        body: summarize(
          selected?.details || selected?.summary || selected?.notes,
          'No POI detail available for this record.'
        ),
        onBack: navigation.goBack,
        onHome: navigation.goHome,
      });
    }
    case QUEST_SCREEN_VILLAINS:
      return buildListScreen({
        title: 'VILLAINS',
        subtitle: `${data.villains.length} threat profiles loaded.`,
        emptyMessage: 'No villain profiles found.',
        items: data.villains.slice(0, 6).map((entry) => ({
          id: entry.id,
          label: entry.alias || entry.id || 'UNKNOWN PROFILE',
          description: summarize(
            entry.summary || entry.status,
            'No threat summary available.'
          ),
        })),
        onSelect: navigation.openVillainDetail,
        onBack: navigation.goBack,
        onHome: navigation.goHome,
      });
    case QUEST_SCREEN_VILLAIN_DETAIL: {
      const selected = data.villains.find(
        (entry) => String(entry.id) === navigation.selectedId
      );
      return buildDetailScreen({
        title: selected?.alias || 'VILLAIN DETAIL',
        subtitle:
          selected?.real_name || selected?.status || selected?.id || 'Unknown profile',
        body: summarize(
          selected?.summary || selected?.notes || selected?.patterns,
          'No villain detail available for this record.'
        ),
        onBack: navigation.goBack,
        onHome: navigation.goHome,
      });
    }
    case QUEST_SCREEN_HOME:
    default:
      return buildHomeScreen(navigation);
  }
};

export { buildQuestScreen };
