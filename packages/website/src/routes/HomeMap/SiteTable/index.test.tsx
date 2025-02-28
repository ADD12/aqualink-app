import React from 'react';
import configureStore from 'redux-mock-store';

import { mockSite } from 'mocks/mockSite';
import { mockUser } from 'mocks/mockUser';
import { renderWithProviders } from 'utils/test-utils';
import SiteTable from '.';

jest.mock('./SelectedSiteCard', () => 'Mock-SelectedSiteCard');

const mockStore = configureStore([]);

describe('SiteTable', () => {
  let element: HTMLElement;
  beforeEach(() => {
    const store = mockStore({
      user: {
        userInfo: mockUser,
      },
      sitesList: {
        list: [mockSite],
        sitesToDisplay: [mockSite],
        loading: false,
        error: null,
      },
      selectedSite: {
        loading: false,
        error: null,
      },
      homepage: {
        siteOnMap: null,
      },
    });

    const openDrawer = false;

    store.dispatch = jest.fn();

    element = renderWithProviders(<SiteTable isDrawerOpen={openDrawer} />, {
      store,
    }).container;
  });

  it('should render with given state from Redux store', () => {
    expect(element).toMatchSnapshot();
  });
});
