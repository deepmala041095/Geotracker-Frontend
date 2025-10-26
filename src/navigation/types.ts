export type POIStackParamList = {
  POIList: undefined;
  POIDetail: { id: string };
  EditPOI: { id: string };
  POIForm: { id?: string };
  // Add other screen params as needed
};

// This is needed for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends POIStackParamList {}
  }
}
