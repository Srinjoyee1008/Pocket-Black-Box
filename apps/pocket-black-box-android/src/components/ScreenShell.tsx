import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Appbar, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

export function ScreenShell({title, subtitle, children, onRefresh}: React.PropsWithChildren<{
  title: string; subtitle: string; onRefresh?: () => void;
}>): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Appbar.Header elevated style={styles.header}>
        <Appbar.Content title={title} titleStyle={styles.title} />
        {onRefresh ? <Appbar.Action icon="refresh" accessibilityLabel="Refresh reports" onPress={onRefresh} /> : null}
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text variant="labelMedium" style={styles.eyebrow}>OFFLINE FIELD CONSOLE</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
        <Text style={styles.footer} variant="labelSmall">Stored on this device · No account or internet required</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F3F6F8'},
  header: {backgroundColor: '#FFFFFF', elevation: 1},
  title: {fontWeight: '700', color: '#174A6E'},
  content: {padding: 16, paddingBottom: 28, gap: 14},
  intro: {gap: 4, paddingVertical: 2},
  eyebrow: {color: '#D58A16', letterSpacing: 1.1, fontWeight: '800'},
  subtitle: {color: '#617382', lineHeight: 21},
  footer: {color: '#617382', textAlign: 'center', paddingVertical: 10},
});
