import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  AuthorProfile: { authorId: string };
  Analytics: undefined;
  Bookmarks: undefined;
  Notifications: undefined;
  PostDetail: { postId: string; focusComments?: boolean };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  AuthorProfile: { authorId: string };
  Analytics: undefined;
  Bookmarks: undefined;
  Notifications: undefined;
  PostDetail: { postId: string; focusComments?: boolean };
};

export type AuthorProfileRouteProp = RouteProp<RootStackParamList, 'AuthorProfile'>;
export type AuthorProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AuthorProfile'>;
