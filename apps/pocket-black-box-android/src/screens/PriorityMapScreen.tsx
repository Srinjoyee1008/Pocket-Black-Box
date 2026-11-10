import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ActivityIndicator, Banner, Button, Card, Text} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {Report} from '../domain/report';
import {reportRepository} from '../data/reportRepository';
import ReportCard from '../components/ReportCard';
import {ScreenShell} from '../components/ScreenShell';

const urgencyColor = {high: '#A13B32', medium: '#D58A16', low: '#39724C'};

export default function PriorityMapScreen(): React.JSX.Element {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
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
  const coordinates = reports.filter(report =>
    report.location?.latitude != null && report.location.longitude != null);

  return (
    <ScreenShell title="Priority map" subtitle="Local report locations only. No online map tiles, map SDK, or network lookup.">
      <Card mode="elevated" style={styles.panel}>
        <Card.Title title="Offline location board" subtitle="List and manual-area fallback" left={props => <Icon {...props} name="map-marker-radius-outline" />} />
        <Card.Content style={styles.content}>
          <View style={styles.mapFallback}>
            <Text variant="labelLarge" style={styles.mapTitle}>ON-DEVICE LOCATION VIEW</Text>
            <Text variant="bodyMedium" style={styles.mapText}>Relative coordinate plot from locally saved report positions. No street map, external tiles, or network lookup.</Text>
            <Text variant="labelMedium" style={styles.count}>{coordinates.length} reports with coordinates · {reports.filter(report => report.location?.area).length} area labels</Text>
            {coordinates.length ? <CoordinatePlot reports={coordinates} /> : (
              <Text variant="bodySmall" style={styles.muted}>Add coordinates to a report to place it on this relative grid.</Text>
            )}
          </View>
          {loadError ? <Banner visible icon="alert-outline" actions={[{label: 'Retry', onPress: () => void load()}]}>{loadError}</Banner> : null}
          {loading ? <ActivityIndicator /> : null}
          {!loading && reports.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="titleMedium" style={styles.primary}>No located reports yet</Text>
              <Text variant="bodyMedium" style={styles.muted}>Create a report and add a landmark or coordinates. Manual area names remain available without GPS.</Text>
            </View>
          ) : null}
          {!loading ? reports.map(report => <ReportCard key={report.id} report={report} />) : null}
          <Button mode="outlined" icon="refresh" onPress={() => void load()}>Refresh local locations</Button>
        </Card.Content>
      </Card>
    </ScreenShell>
  );
}

function CoordinatePlot({reports}: {reports: Report[]}): React.JSX.Element {
  const locations = reports.map(report => ({report, latitude: report.location!.latitude!, longitude: report.location!.longitude!}));
  const latitudes = locations.map(item => item.latitude);
  const longitudes = locations.map(item => item.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const x = (longitude: number) => maxLongitude === minLongitude ? 50 : 8 + ((longitude - minLongitude) / (maxLongitude - minLongitude)) * 84;
  const y = (latitude: number) => maxLatitude === minLatitude ? 50 : 8 + ((maxLatitude - latitude) / (maxLatitude - minLatitude)) * 84;
  return (
    <View style={styles.plot} accessibilityLabel="Relative offline coordinate plot">
      <View style={styles.horizontalGrid} />
      <View style={styles.verticalGrid} />
      {locations.map(({report, latitude, longitude}) => (
        <View key={report.id} style={[styles.marker, {left: `${x(longitude)}%`, top: `${y(latitude)}%`}]}
          accessibilityLabel={`${report.urgency} priority report ${report.id.slice(0, 8)}`}>
          <View style={[styles.dot, {backgroundColor: urgencyColor[report.urgency]}]} />
          <Text variant="labelSmall" style={styles.markerLabel}>{report.id.slice(0, 4).toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {borderRadius: 16, backgroundColor: '#FFFFFF'},
  content: {gap: 13, paddingBottom: 18},
  mapFallback: {padding: 18, borderRadius: 13, backgroundColor: '#E8EEF2', gap: 8, borderWidth: 1, borderColor: '#D4DEE5'},
  mapTitle: {color: '#174A6E', letterSpacing: 0.7},
  mapText: {color: '#172B3A', lineHeight: 21},
  count: {color: '#617382'},
  plot: {height: 190, borderRadius: 10, borderWidth: 1, borderColor: '#B9C9D3', backgroundColor: '#F6F9FA', overflow: 'hidden', position: 'relative'},
  horizontalGrid: {position: 'absolute', top: '50%', left: 0, right: 0, borderTopWidth: 1, borderColor: '#D4DEE5'},
  verticalGrid: {position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeftWidth: 1, borderColor: '#D4DEE5'},
  marker: {position: 'absolute', alignItems: 'center', transform: [{translateX: -14}, {translateY: -10}]},
  dot: {width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFFFFF'},
  markerLabel: {color: '#172B3A', backgroundColor: '#FFFFFF', paddingHorizontal: 3, borderRadius: 4},
  empty: {paddingVertical: 16, gap: 7},
  primary: {color: '#174A6E'},
  muted: {color: '#617382', lineHeight: 20},
});
