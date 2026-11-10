import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Card, Chip, HelperText, SegmentedButtons, Snackbar, Text, TextInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {Location, Report, Urgency} from '../domain/report';
import {classifyOffline} from '../domain/triage';
import {reportRepository} from '../data/reportRepository';
import {ScreenShell} from '../components/ScreenShell';

function id(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 3) | 8).toString(16);
  });
}

export default function NewReportScreen(): React.JSX.Element {
  const [text, setText] = React.useState('');
  const [urgency, setUrgency] = React.useState<Urgency>('medium');
  const [needs, setNeeds] = React.useState<string[]>([]);
  const [area, setArea] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [suggestion, setSuggestion] = React.useState('Volunteer review required');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const triage = () => {
    if (!text.trim()) { setError('Enter report details before requesting suggestions.'); return; }
    const result = classifyOffline(text);
    setUrgency(result.suggestions.urgency);
    setNeeds(result.suggestions.needs);
    setSuggestion(`${result.modelStatus} · ${(result.confidence * 100).toFixed(0)}% confidence · review and edit`);
    setError('');
  };

  const save = async () => {
    if (!text.trim()) { setError('Report text is required.'); return; }
    const hasLat = latitude.trim() !== '';
    const hasLon = longitude.trim() !== '';
    if (hasLat !== hasLon || (hasLat && (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) ||
        Number(latitude) < -90 || Number(latitude) > 90 || Number(longitude) < -180 || Number(longitude) > 180))) {
      setError('Enter a valid latitude and longitude pair, or leave both blank.');
      return;
    }
    const location: Location | null = hasLat && hasLon
      ? {latitude: Number(latitude), longitude: Number(longitude), area: area.trim() || undefined}
      : area.trim() ? {area: area.trim()} : null;
    const now = new Date().toISOString();
    const report: Report = {
      id: id(), text: text.trim(), location, needs, urgency,
      status: 'needs_review', created_at: now, updated_at: now,
      revision: 1, sync_state: 'local',
    };
    setSaving(true);
    try {
      await reportRepository.create(report);
      setMessage('Saved on this device. No network connection is needed.');
      setText(''); setNeeds([]); setUrgency('medium'); setSuggestion('Volunteer review required');
      setArea(''); setLatitude(''); setLongitude(''); setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this report.');
    } finally { setSaving(false); }
  };

  const setNeed = (need: string) => setNeeds(current => current.includes(need) ? current.filter(item => item !== need) : [...current, need]);

  return (
    <ScreenShell title="New report" subtitle="Capture text first. On-device suggestions remain editable and never replace volunteer judgment.">
      <Card mode="elevated" style={styles.card}>
        <Card.Title title="Incident details" subtitle="Saved to private device storage" left={props => <Icon {...props} name="file-document-edit-outline" />} />
        <Card.Content style={styles.form}>
          <TextInput mode="outlined" label="What happened? *" value={text} onChangeText={setText}
            multiline numberOfLines={5} maxLength={4000} style={styles.textInput} outlineColor="#D4DEE5"
            placeholder="Describe the need, people affected, and immediate context. English and Bengali keywords are supported." />
          {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          <View style={styles.actions}>
            <Button mode="contained-tonal" icon="lightbulb-outline" onPress={triage}>Suggest offline triage</Button>
          </View>
          <Card mode="outlined" style={styles.suggestion}>
            <Card.Content style={styles.suggestionContent}>
              <Text variant="labelLarge" style={styles.primary}>REVIEWABLE SUGGESTION</Text>
              <Text variant="bodySmall" style={styles.muted}>{suggestion}</Text>
              <SegmentedButtons value={urgency} onValueChange={value => setUrgency(value as Urgency)}
                buttons={[
                  {value: 'low', label: 'Low'},
                  {value: 'medium', label: 'Medium'},
                  {value: 'high', label: 'High'},
                ]} />
              <View style={styles.chips}>
                {['medical', 'water', 'food', 'shelter', 'rescue', 'access'].map(need =>
                  <Chip key={need} selected={needs.includes(need)} onPress={() => setNeed(need)}>{need}</Chip>)}
              </View>
            </Card.Content>
          </Card>
        </Card.Content>
      </Card>
      <Card mode="elevated" style={styles.card}>
        <Card.Title title="Location (optional)" subtitle="Area label works without GPS or maps" left={props => <Icon {...props} name="map-marker-outline" />} />
        <Card.Content style={styles.form}>
          <TextInput mode="outlined" label="Area / landmark" value={area} onChangeText={setArea} outlineColor="#D4DEE5" />
          <View style={styles.coordinates}>
            <TextInput mode="outlined" label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" style={styles.coordinate} outlineColor="#D4DEE5" />
            <TextInput mode="outlined" label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" style={styles.coordinate} outlineColor="#D4DEE5" />
          </View>
          <Button mode="contained" icon="content-save-outline" loading={saving} disabled={saving} onPress={() => void save()}>Save report on device</Button>
          <Text variant="bodySmall" style={styles.muted}>No tiles or network location service is used. Enter coordinates or an area name manually.</Text>
        </Card.Content>
      </Card>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={4500}>{message}</Snackbar>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {borderRadius: 16, backgroundColor: '#FFFFFF'},
  form: {gap: 12, paddingBottom: 18},
  textInput: {minHeight: 122, backgroundColor: '#FFFFFF'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  suggestion: {borderColor: '#D4DEE5', borderRadius: 13, backgroundColor: '#FAFCFD'},
  suggestionContent: {gap: 12},
  primary: {color: '#174A6E', letterSpacing: 0.6},
  muted: {color: '#617382', lineHeight: 19},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  coordinates: {flexDirection: 'row', gap: 10},
  coordinate: {flex: 1, backgroundColor: '#FFFFFF'},
});
