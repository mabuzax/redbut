import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyBill from '../../components/bill/MyBill';

// Mock react-timeago if it were used in MyBill (it's not, but good practice)
jest.mock('react-timeago', () => {
  return ({ date }: { date: string | Date }) => <time DATETIME={new Date(date).toISOString()}>{new Date(date).toLocaleDateString()}</time>;
});

// Mock fetch API for requests and orders
const mockFetch = jest.fn();

describe('MyBill Component', () => {
  const mockUserId = 'test-user-id';
  const mockTableNumber = 42;
  const mockSessionId = 'test-session-id';
  const mockToken = 'mock-jwt-token';
  const mockOnWaiterRequested = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }), // Default empty bill
    });
  });

  // Helper to render the component
  const renderComponent = (props?: Partial<React.ComponentProps<typeof MyBill>>) => {
    return render(
      <MyBill
        userId={mockUserId}
        tableNumber={mockTableNumber}
        sessionId={mockSessionId}
        token={mockToken}
        onWaiterRequested={mockOnWaiterRequested}
        {...props}
      />
    );
  };

  // Test initial rendering states
  describe('Initial Render', () => {
    test('shows loading state initially', () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep it loading
      renderComponent();
      expect(screen.getByText('Loading bill...')).toBeInTheDocument();
    });

    test('shows "No orders found" when no data is fetched', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('No orders found for this session.')).toBeInTheDocument());
      expect(screen.getByText('Use below button if ready to pay')).toBeInTheDocument();
    });

    test('displays orders and total correctly when data is fetched', async () => {
      const mockOrders = [
        { id: 'ord1', tableNumber: 42, sessionId: mockSessionId, item: 'Pizza', price: 12.99, createdAt: new Date().toISOString() },
        { id: 'ord2', tableNumber: 42, sessionId: mockSessionId, item: 'Coke', price: 3.00, createdAt: new Date().toISOString() },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: mockOrders, total: 15.99 }),
      });
      renderComponent();

      await waitFor(() => expect(screen.getByText('Pizza')).toBeInTheDocument());
      expect(screen.getByText('Coke')).toBeInTheDocument();
      expect(screen.getByText('$12.99')).toBeInTheDocument();
      expect(screen.getByText('$3.00')).toBeInTheDocument();
      expect(screen.getByText('Total:')).toBeInTheDocument();
      expect(screen.getByText('$15.99')).toBeInTheDocument();
    });

    test('shows error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Network Error',
        json: () => Promise.resolve({ message: 'Failed to fetch bill' }),
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Failed to fetch bill/i)).toBeInTheDocument());
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  // "Ready to Pay" button functionality
  describe('"Ready to Pay" Button', () => {
    test('button is enabled by default', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Ready to Pay/i })).toBeEnabled();
    });

    test('clicking "Ready to Pay" makes correct API call and shows success message', async () => {
      const user = userEvent.setup();
      renderComponent();

      const readyToPayButton = screen.getByRole('button', { name: /Ready to Pay/i });
      await user.click(readyToPayButton);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/requests'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            userId: mockUserId,
            tableNumber: mockTableNumber,
            content: 'Ready to pay',
            status: 'New',
          }),
        })
      ));
      expect(mockOnWaiterRequested).toHaveBeenCalled();
      expect(screen.getByText('Waiter Informed: Your request to pay has been sent!')).toBeInTheDocument();
    });

    test('handles duplicate "Ready to Pay" requests', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409, // Conflict
        json: () => Promise.resolve({ message: 'Already requested payment, buzzing waiter again' }),
      });
      renderComponent();

      const readyToPayButton = screen.getByRole('button', { name: /Ready to Pay/i });
      await user.click(readyToPayButton);

      await waitFor(() => expect(screen.getByText('Already requested, buzzing waiter again.')).toBeInTheDocument());
      expect(mockOnWaiterRequested).toHaveBeenCalled(); // Still calls callback for splash
    });

    test('shows error when "Ready to Pay" request fails', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
        json: () => Promise.resolve({ message: 'Failed to send request' }),
      });
      renderComponent();

      const readyToPayButton = screen.getByRole('button', { name: /Ready to Pay/i });
      await user.click(readyToPayButton);

      await waitFor(() => expect(screen.getByText('Failed to send request')).toBeInTheDocument());
      expect(mockOnWaiterRequested).not.toHaveBeenCalled();
    });
  });

  // Test refresh functionality
  test('refresh button fetches bill again', async () => {
    const mockOrders1 = [{ id: 'ord1', tableNumber: 42, sessionId: mockSessionId, item: 'Pizza', price: 10.00, createdAt: new Date().toISOString() }];
    const mockOrders2 = [
      ...mockOrders1,
      { id: 'ord3', tableNumber: 42, sessionId: mockSessionId, item: 'Burger', price: 15.00, createdAt: new Date().toISOString() },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockOrders1, total: 10.00 }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockOrders2, total: 25.00 }),
    });
    renderComponent();

    await waitFor(() => expect(screen.getByText('Pizza')).toBeInTheDocument());
    expect(screen.getByText('$10.00')).toBeInTheDocument();

    const refreshButton = screen.getByLabelText('Refresh bill');
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText('Burger')).toBeInTheDocument());
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial fetch + refresh fetch
  });

  // Currency formatting test
  test('formats currency correctly', async () => {
    const mockOrders = [
      { id: 'ord1', tableNumber: 42, sessionId: mockSessionId, item: 'Item', price: 9.99, createdAt: new Date().toISOString() },
      { id: 'ord2', tableNumber: 42, sessionId: mockSessionId, item: 'Item2', price: 123.45, createdAt: new Date().toISOString() },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockOrders, total: 133.44 }),
    });
    renderComponent();

    await waitFor(() => expect(screen.getByText('$9.99')).toBeInTheDocument());
    expect(screen.getByText('$123.45')).toBeInTheDocument();
    expect(screen.getByText('$133.44')).toBeInTheDocument();
  });
});
