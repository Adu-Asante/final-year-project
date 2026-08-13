// src/shared/navigation/AppNavigator.tsx
// Bottom tab navigation — Home, Conversation, Camera, Phrasebook, Transcript, History, Settings

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen }         from '../../features/home/HomeScreen';
import { ConversationScreen } from '../../features/conversation/ConversationScreen';
import { CameraScreen }       from '../../features/camera/CameraScreen';
import { PhrasebookScreen }   from '../../features/phrasebook/PhrasebookScreen';
import { HistoryScreen }      from '../../features/history/HistoryScreen';
import { SettingsScreen }     from '../../features/settings/SettingsScreen';
import { Colors }             from '../theme';

export type RootTabParamList = {
  Home:         undefined;
  Conversation: undefined;
  Camera:       undefined;
  Phrasebook:   undefined;
  History:      undefined;
  Settings:     undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Ghanaian Gold palette tailored for clean white surfaces
const GOLD_ACTIVE = '#D97706';       // Rich Gold/Amber (high contrast on white)
const GOLD_PILL_BG = '#FEF3C7';      // Soft gold pill background
const INACTIVE_COLOR = '#64748B';    // Crisp slate gray

const VoxaTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card:       Colors.surface,
    text:       Colors.textPrimary,
    border:     Colors.border,
    primary:    GOLD_ACTIVE,
  },
};

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface TabConfigItem {
  name: keyof RootTabParamList;
  label: string;
  activeIcon: IoniconsName;
  inactiveIcon: IoniconsName;
  component: React.FC<any>;
}

const TAB_CONFIG: TabConfigItem[] = [
  { name: 'Home',         label: 'Home',       activeIcon: 'home',        inactiveIcon: 'home-outline',        component: HomeScreen },
  { name: 'Conversation', label: 'Chat',       activeIcon: 'chatbubbles', inactiveIcon: 'chatbubbles-outline', component: ConversationScreen },
  { name: 'Camera',       label: 'Camera',     activeIcon: 'camera',      inactiveIcon: 'camera-outline',      component: CameraScreen },
  { name: 'Phrasebook',   label: 'Phrases',    activeIcon: 'book',        inactiveIcon: 'book-outline',        component: PhrasebookScreen },
  { name: 'History',      label: 'History',    activeIcon: 'time',        inactiveIcon: 'time-outline',        component: HistoryScreen },
  { name: 'Settings',     label: 'Settings',   activeIcon: 'settings',    inactiveIcon: 'settings-outline',    component: SettingsScreen },
];

interface TabIconProps {
  label:        string;
  activeIcon:   IoniconsName;
  inactiveIcon: IoniconsName;
  focused:      boolean;
}

const TabItem: React.FC<TabIconProps> = ({ label, activeIcon, inactiveIcon, focused }) => {
  const iconName = focused ? activeIcon : inactiveIcon;
  const iconColor = focused ? GOLD_ACTIVE : INACTIVE_COLOR;

  return (
    <View style={tabStyles.tabItemWrapper}>
      <View style={[tabStyles.iconBox, focused && tabStyles.iconBoxActive]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[tabStyles.label, { color: iconColor }, focused && tabStyles.labelActive]}
      >
        {label}
      </Text>
    </View>
  );
};

const tabStyles = StyleSheet.create({
  tabItemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
    width: '100%',
  },
  iconBox: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBoxActive: {
    backgroundColor: GOLD_PILL_BG,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
  },
});

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={VoxaTheme}>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          height:          Platform.OS === 'ios' ? 78 : 62,
          paddingBottom:   Platform.OS === 'ios' ? 22 : 8,
          paddingTop:      6,
        },
        tabBarShowLabel: false,
      }}
    >
      {TAB_CONFIG.map(({ name, label, activeIcon, inactiveIcon, component: Screen }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={Screen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem
                label={label}
                activeIcon={activeIcon}
                inactiveIcon={inactiveIcon}
                focused={focused}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  </NavigationContainer>
);
