import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  POIList: undefined;
  POIDetail: {
    id: string | number;
    distance?: number;
  };
  POIForm: {
    id?: string | number;
  };
};

export type POIListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'POIList'>;
export type POIDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'POIDetail'>;
