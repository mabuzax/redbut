import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyRequests from '../../components/requests/MyRequests';

// Mock react-timeago to avoid issues with its internal logic in tests
jest.mock('react-timeago', () => {
  return ({ date }: { date: string | Date }) => <time dateTime={new Date(date).toISOString()}>{new Date(date).toLocaleDateString()}</time>;
});

// Mock fetch API for requests
const mockFetch = jest.fn();

describe('MyRequests Component', () => {
  const mockUserId = 'test-user-id';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]), // Default empty array for requests
    });
  });

  // Helper to render the component
  const renderComponent = (props?: Partial<React.ComponentProps<typeof MyRequests>>) => {
    return render(<MyRequests userId={mockUserId} token={mockToken} {...props} />);
  };

  // Test initial rendering states
  describe('Initial Render', () => {
    test('shows loading state initially', () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep it loading
      renderComponent();
      expect(screen.getByText('Loading requests...')).toBeInTheDocument();
    });

    test('shows "No requests found" when no data is fetched', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('No requests found.')).toBeInTheDocument());
    });

    test('displays requests correctly when data is fetched', async () => {
      const mockRequests = [
        {
          id: 'req1',
          userId: mockUserId,
          tableNumber: 1,
          content: 'Need more water',
          status: 'New',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'req2',
          userId: mockUserId,
          tableNumber: 1,
          content: 'Ready to order',
          status: 'OnHold',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRequests),
      });
      renderComponent();

      await waitFor(() => expect(screen.getByText('Need more water')).toBeInTheDocument());
      expect(screen.getByText('Ready to order')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('OnHold')).toBeInTheDocument();
    });

    test('shows error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Network Error',
        json: () => Promise.resolve({ message: 'Failed to fetch' }),
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument());
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  // Test modal interactions
  describe('Modal Interactions', () => {
    const mockRequests = [
      {
        id: 'req1',
        userId: mockUserId,
        tableNumber: 1,
        content: 'Need more water',
        status: 'New',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRequests),
      });
    });

    test('opens modal on request row click', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Need more water')).toBeInTheDocument());

      const requestRow = screen.getByText('Need more water');
      fireEvent.click(requestRow);

      await waitFor(() => expect(screen.getByText('Request:')).toBeInTheDocument());
      expect(screen.getByText('Need more water')).toBeInTheDocument(); // Content in modal
      expect(screen.getByText('Status:')).toBeInTheDocument();
    });

    test('closes modal on close button click', async () => {
      const user = userEvent.setup();
      renderComponent();
      await waitFor(() => expect(screen.getByText('Need more water')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Need more water'));
      await waitFor(() => expect(screen.getByText('Request:')).toBeInTheDocument());

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);

      await waitFor(() => expect(screen.queryByText('Request:')).not.toBeInTheDocument());
    });

    test('closes modal on overlay click', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Need more water')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Need more water'));
      await waitFor(() => expect(screen.getByText('Request:')).toBeInTheDocument());

      // Click outside the modal content (on the overlay)
      fireEvent.click(screen.getByTestId('modal-overlay')); // Assuming you add data-testid="modal-overlay" to the overlay div

      await waitFor(() => expect(screen.queryByText('Request:')).not.toBeInTheDocument());
    });
  });

  // Test editing and status management
  describe('Editing and Status Management', () => {
    const mockRequestNew = {
      id: 'req1',
      userId: mockUserId,
      tableNumber: 1,
      content: 'Need more water',
      status: 'New',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockRequestOnHold = {
      id: 'req2',
      userId: mockUserId,
      tableNumber: 1,
      content: 'Refill drinks',
      status: 'OnHold',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockRequestDone = {
      id: 'req3',
      userId: mockUserId,
      tableNumber: 1,
      content: 'Bill requested',
      status: 'Done',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    test('allows editing content and status for "New" requests', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockRequestNew]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockRequestNew, content: 'New content', status: 'OnHold' }]),
      }); // For refresh

      renderComponent();
      await waitFor(() => expect(screen.getByText('Need more water')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Need more water'));
      await waitFor(() => expect(screen.getByLabelText('Request:')).toBeInTheDocument());

      const contentTextarea = screen.getByLabelText('Request:') as HTMLTextAreaElement;
      await user.clear(contentTextarea);
      await user.type(contentTextarea, 'New content for water');
      expect(contentTextarea.value).toBe('New content for water');

      const statusSelect = screen.getByLabelText('Status:') as HTMLSelectElement;
      await user.selectOptions(statusSelect, 'OnHold');
      expect(statusSelect.value).toBe('OnHold');

      const updateButton = screen.getByRole('button', { name: /Update Request/i });
      await user.click(updateButton);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/requests/${mockRequestNew.id}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: 'New content for water', status: 'OnHold' }),
        })
      ));
      await waitFor(() => expect(screen.queryByText('Request:')).not.toBeInTheDocument()); // Modal closed
      await waitFor(() => expect(screen.getByText('New content for water')).toBeInTheDocument()); // List updated
    });

    test('allows changing status for "OnHold" requests to "New" or "Cancelled"', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockRequestOnHold]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockRequestOnHold, status: 'New' }]),
      }); // For refresh

      renderComponent();
      await waitFor(() => expect(screen.getByText('Refill drinks')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Refill drinks'));
      await waitFor(() => expect(screen.getByLabelText('Status:')).toBeInTheDocument());

      const statusSelect = screen.getByLabelText('Status:') as HTMLSelectElement;
      expect(statusSelect.options.length).toBe(3); // On Hold, Activate, Cancel
      expect(statusSelect.options[0].value).toBe('OnHold');
      expect(statusSelect.options[1].value).toBe('New');
      expect(statusSelect.options[2].value).toBe('Cancelled');

      await user.selectOptions(statusSelect, 'New');
      expect(statusSelect.value).toBe('New');

      const updateButton = screen.getByRole('button', { name: /Update Request/i });
      await user.click(updateButton);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/requests/${mockRequestOnHold.id}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'New' }),
        })
      ));
    });

    test('does not allow editing content or status for "Done" requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockRequestDone]),
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('Bill requested')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Bill requested'));
      await waitFor(() => expect(screen.getByText('Request:')).toBeInTheDocument());

      expect(screen.getByText('Bill requested')).toBeInTheDocument(); // Content displayed as text
      expect(screen.getByText('Done')).toBeInTheDocument(); // Status displayed as text
      expect(screen.queryByLabelText('Request:')).not.toBeInstanceOf(HTMLTextAreaElement); // Not a textarea
      expect(screen.queryByLabelText('Status:')).not.toBeInstanceOf(HTMLSelectElement); // Not a select
      expect(screen.queryByRole('button', { name: /Update Request/i })).not.toBeInTheDocument();
    });

    test('shows error when update request fails', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockRequestNew]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Update Failed',
        json: () => Promise.resolve({ message: 'Failed to update request.' }),
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('Need more water')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Need more water'));
      await waitFor(() => expect(screen.getByLabelText('Request:')).toBeInTheDocument());

      const contentTextarea = screen.getByLabelText('Request:') as HTMLTextAreaElement;
      await user.type(contentTextarea, ' updated');

      const updateButton = screen.getByRole('button', { name: /Update Request/i });
      await user.click(updateButton);

      await waitFor(() => expect(screen.getByText('Failed to update request.')).toBeInTheDocument());
    });
  });

  // Test refresh functionality
  test('refresh button fetches requests again', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 'req1',
          userId: mockUserId,
          tableNumber: 1,
          content: 'New request after refresh',
          status: 'New',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    });
    renderComponent();
    await waitFor(() => expect(screen.getByText('No requests found.')).toBeInTheDocument());

    const refreshButton = screen.getByLabelText('Refresh requests');
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText('New request after refresh')).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial fetch + refresh fetch
  });
});
