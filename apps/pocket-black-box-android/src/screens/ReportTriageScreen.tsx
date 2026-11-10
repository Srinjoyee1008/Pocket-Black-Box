import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ActivityIndicator, Banner, Button, Card, Text} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {Report} from '../domain/report';
import {reportRepository} from '../data/reportRepository';
import ReportCard from '../components/ReportCard';
import {ScreenShell} from '../components/ScreenShell';

export default function ReportTriageScreen(): React.JSX.Element {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [demoMessage, setDemoMessage] = React.useState('');
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setReports(await reportRepository.list());
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Reports could not be loaded from this device.');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    const unsubscribe = reportRepository.subscribe(() => { void load(); });
    void load();
    return unsubscribe;
  }, [load]);
  const high = reports.filter(item => item.urgency === 'high').length;
  const review = reports.filter(item => item.status === 'needs_review').length;
  const update = async (id: string, changes: Partial<Pick<Report, 'urgency' | 'status'>>) => {
    try {
      await reportRepository.update(id, changes);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Report update could not be saved.');
    }
  };
  const addDemoScenario = async () => {
    try {
      const count = await reportRepository.loadDemoScenario();
      setDemoMessage(count
        ? `Loaded ${count} fictional Sundarbans flood reports. They are marked DEMO.`
        : 'The fictional demo reports are already loaded.');
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Demo reports could not be loaded.');
    }
  };

  return (
    <ScreenShell title="Pocket Black Box" subtitle="Review local incidents and volunteer-reviewed triage suggestions." onRefresh={() => void load()}>
      {loadError ? <Banner visible actions={[{label: 'Retry', onPress: () => void load()}]} icon="alert-outline">
        {loadError}
      </Banner> : null}
      <View style={styles.metrics}>
        <Metric label="LOCAL REPORTS" value={String(reports.length)} icon="clipboard-text-outline" />
        <Metric label="HIGH URGENCY" value={String(high)} icon="alert-outline" urgent />
        <Metric label="REVIEW QUEUE" value={String(review)} icon="account-check-outline" />
      </View>
      <Card mode="outlined" style={styles.demo}>
        <Card.Content style={styles.demoContent}>
          <Text variant="titleSmall" style={styles.noteTitle}>DEMO SCENARIO · SUNDARBANS FLOOD</Text>
          <Text variant="bodySmall" style={styles.muted}>Load four clearly marked fictional reports to demonstrate triage, volunteer review, and the offline priority map. No network or setup required.</Text>
          <Button mode="contained-tonal" icon="play-circle-outline" onPress={() => void addDemoScenario()}>
            Load demo reports
          </Button>
          {demoMessage ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.demoMessage}>{demoMessage}</Text> : null}
        </Card.Content>
      </Card>
      <Card mode="elevated" style={styles.section}>
        <Card.Title title="Report triage" subtitle="Suggestions are not diagnoses. Confirm details before sharing." left={props => <Icon {...props} name="clipboard-check-outline" />} />
        <Card.Content style={styles.list}>
          {loading ? <ActivityIndicator accessibilityLabel="Loading reports" /> : null}
          {!loading && reports.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="titleMedium" style={styles.emptyTitle}>No reports saved yet</Text>
              <Text variant="bodyMedium" style={styles.muted}>Create a report or load the fictional demo scenario above. Everything is saved on this device.</Text>
            </View>
          ) : null}
          {!loading ? reports.map(report => <ReportCard key={report.id} report={report}
            onChange={changes => void update(report.id, changes)} />) : null}
        </Card.Content>
      </Card>
      <Card mode="outlined" style={styles.note}>
        <Card.Content style={styles.noteContent}>
          <Text variant="titleSmall" style={styles.noteTitle}>LOCAL-FIRST STATUS</Text>
          <Text variant="bodySmall" style={styles.muted}>Reports and triage persist and run on this device. No account, server, or internet connection is needed.</Text>
        </Card.Content>
      </Card>
    </ScreenShell>
  );
}

function Metric({label, value, icon, urgent}: {label: string; value: string; icon: string; urgent?: boolean}): React.JSX.Element {
  return (
    <Card mode="elevated" style={styles.metric}>
      <Card.Content style={styles.metricContent}>
        <Text variant="labelSmall" style={styles.muted}>{label}</Text>
        <View style={styles.metricValue}>
          <Text variant="headlineMedium" style={[styles.value, urgent && styles.urgent]}>{value}</Text>
          <Icon name={icon} size={20} color={urgent ? '#A13B32' : '#617382'} />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  metrics: {flexDirection: 'row', gap: 9},
  metric: {flex: 1, borderRadius: 14, backgroundColor: '#FFFFFF'},
  metricContent: {paddingHorizontal: 10, gap: 5},
  metricValue: {flexDirection: 'row', alignItems: 'center'},
  value: {color: '#174A6E', fontWeight: '700'},
  urgent: {color: '#A13B32'},
  section: {borderRadius: 16, backgroundColor: '#FFFFFF'},
  list: {gap: 12, paddingBottom: 16},
  empty: {paddingVertical: 20, gap: 8},
  emptyTitle: {color: '#172B3A', fontWeight: '700'},
  muted: {color: '#617382', lineHeight: 20},
  note: {borderRadius: 14, borderColor: '#D4DEE5', backgroundColor: '#FFFFFF'},
  noteContent: {gap: 6},
  noteTitle: {color: '#174A6E', letterSpacing: 0.7},
  demo: {borderRadius: 14, borderColor: '#E8C787', backgroundColor: '#FFFCF5'},
  demoContent: {gap: 9},
  demoMessage: {color: '#39724C'},
});
