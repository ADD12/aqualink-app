import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { BrowserRouter as Router } from 'react-router-dom';
import { mockUser } from 'mocks/mockUser';

import Faq from '.';

vi.mock('common/NavBar', () => ({ default: 'Mock-NavBar' }));
vi.mock('common/Footer', () => ({ default: 'Mock-Footer' }));

const mockStore = configureStore([]);
describe('Faq', () => {
  let element: HTMLElement;
  beforeEach(() => {
    const store = mockStore({
      user: {
        userInfo: mockUser,
        loading: false,
        error: null,
      },
    });

    store.dispatch = vi.fn();

    element = render(
      <Provider store={store}>
        <Router>
          <Faq />
        </Router>
      </Provider>,
    ).container;
  });

  it('should render with given state from Redux store', () => {
    expect(element).toMatchSnapshot();
  });
});
