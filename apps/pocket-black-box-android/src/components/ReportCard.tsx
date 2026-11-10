import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Card, Chip, Text} from 'react-native-paper';
import type {Report, ReportStatus, Urgency} from '../domain/report';

const urgencyColor = {high: '#A13B32', medium: '#9A6410', low: '#39724C'};
const statusLabel = {needs_review: 'Needs review', open: 'Open', assigned: 'Assigned', resolved: 'Resolved'};

export default function ReportCard({report, onChange}: {
  report: Report;
  onChange?: (changes: Partial<Pick<Report, 'urgency' | 'status'>>) => void;
}): React.JSX.Element {
  const nextStatus: Partial<Record<ReportStatus, {status: ReportStatus; label: string}>> = {
    needs_review: {status: 'open', label: 'Mark reviewed'},
    open: {status: 'assigned', label: 'Assign'},
    assigned: {status: 'resolved', label: 'Mark resolved'},
  };
  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={styles.top}>
          <Text variant="labelLarge" style={styles.identifier}>
            {report.id.startsWith('demo-') ? 'FICTIONAL DEMO' : report.id.slice(0, 8).toUpperCase()}
          </Text>
          <Chip compact icon="circle" textStyle={{color: urgencyColor[report.urgency], fontWeight: '700'}}
            style={styles.chip}>{report.urgency.toUpperCase()}</Chip>
        </View>
        <Text variant="bodyLarge" style={styles.summary}>{report.text}</Text>
        <View style={styles.meta}>
          <Text variant="bodySmall" style={styles.muted}>{report.location?.area ?? 'Location not set'}</Text>
          <Text variant="bodySmall" style={styles.muted}>{statusLabel[report.status]}</Text>
        </View>
        {report.needs.length > 0 ? <Text variant="labelSmall" style={styles.needs}>{report.needs.join(' · ')}</Text> : null}
        {onChange ? (
          <View style={styles.controls}>
            {(['low', 'medium', 'high'] as Urgency[]).map(value =>
              <Chip key={value} compact selected={report.urgency === value}
                onPress={() => onChange({urgency: value})}>{value}</Chip>)}
            {nextStatus[report.status] ? (
              <Button compact icon="check-circle-outline"
                onPress={() => onChange({status: nextStatus[report.status]!.status})}>
                {nextStatus[report.status]!.label}
              </Button>
            ) : null}
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {borderRadius: 14, backgroundColor: '#FFFFFF'},
  content: {gap: 10},
  top: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  identifier: {letterSpacing: 0.6, color: '#174A6E', fontWeight: '800'},
  chip: {backgroundColor: '#FBF2E2'},
  summary: {color: '#172B3A', lineHeight: 23, fontWeight: '500'},
  meta: {flexDirection: 'row', justifyContent: 'space-between', gap: 10},
  controls: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4},
  muted: {color: '#617382'},
  needs: {color: '#174A6E', textTransform: 'capitalize'},
});
