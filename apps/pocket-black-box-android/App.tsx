import React from 'react';
import {BottomNavigation, MD3LightTheme, Provider as PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ReportTriageScreen from './src/screens/ReportTriageScreen';
import NewReportScreen from './src/screens/NewReportScreen';
import PriorityMapScreen from './src/screens/PriorityMapScreen';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#174A6E',
    secondary: '#D58A16',
    tertiary: '#D58A16',
    background: '#F3F6F8',
    surface: '#FFFFFF',
    surfaceVariant: '#E8EEF2',
    onSurface: '#172B3A',
    onSurfaceVariant: '#617382',
    outline: '#D4DEE5',
    error: '#A13B32',
  },
  roundness: 12,
};

const routes = [
  {key: 'reports', title: 'Reports', focusedIcon: 'clipboard-list-outline', unfocusedIcon: 'clipboard-list-outline'},
  {key: 'new', title: 'New report', focusedIcon: 'plus-box-outline', unfocusedIcon: 'plus-box-outline'},
  {key: 'map', title: 'Priority map', focusedIcon: 'map-outline', unfocusedIcon: 'map-outline'},
];

export default function App(): React.JSX.Element {
  const [index, setIndex] = React.useState(0);
  const renderScene = BottomNavigation.SceneMap({
    reports: ReportTriageScreen,
    new: NewReportScreen,
    map: PriorityMapScreen,
  });

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <BottomNavigation
          navigationState={{index, routes}}
          onIndexChange={setIndex}
          renderScene={renderScene}
          barStyle={{backgroundColor: '#FFFFFF'}}
          activeColor="#174A6E"
          inactiveColor="#617382"
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
