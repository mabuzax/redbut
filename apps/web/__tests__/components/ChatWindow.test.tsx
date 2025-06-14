import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from '../../components/chat/ChatWindow';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock for localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Mock for socket events and methods
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
};

// Mock implementation for io function
(io as jest.Mock).mockReturnValue(mockSocket);

describe('ChatWindow Component', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  // Connection handling tests
  describe('Connection Handling', () => {
    test('establishes socket connection with correct parameters', () => {
      render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
        />
      );

      // Check if socket.io client was initialized with correct URL
      expect(io).toHaveBeenCalledWith(
        expect.stringContaining('/chat'),
        expect.objectContaining({
          auth: { token: 'test-token' },
        })
      );

      // Check if event listeners were registered
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('assistant-message', expect.any(Function));
    });

    test('falls back to localStorage token if not provided as prop', () => {
      render(<ChatWindow userId="user123" tableNumber={5} />);
      
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'mock-token' },
        })
      );
    });

    test('shows connecting state initially', () => {
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      expect(screen.getByText('Connecting to assistant...')).toBeInTheDocument();
    });

    test('handles connection errors', async () => {
      // Extract the connection error handler
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Find the connect_error callback
      const connectErrorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];
      
      // Simulate connection error
      act(() => {
        connectErrorCallback(new Error('Connection failed'));
      });
      
      expect(await screen.findByText(/Failed to connect to chat server/i)).toBeInTheDocument();
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    test('disconnects socket on unmount', () => {
      const { unmount } = render(
        <ChatWindow userId="user123" tableNumber={5} token="test-token" />
      );
      
      unmount();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  // Message handling tests
  describe('Message Sending and Receiving', () => {
    test('sends message when user submits input', async () => {
      const user = userEvent.setup();
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Simulate successful connection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      act(() => {
        connectCallback();
      });
      
      // Type and send a message
      const input = screen.getByPlaceholderText(/e\.g Tell me about your specials/i);
      await user.type(input, 'Hello, I would like to order');
      
      const sendButton = screen.getByLabelText('Send message');
      await user.click(sendButton);
      
      // Check if the message was emitted to the socket
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'client-message',
        expect.objectContaining({
          content: 'Hello, I would like to order',
        })
      );
      
      // Check if the message appears in the chat
      expect(screen.getByText('Hello, I would like to order')).toBeInTheDocument();
    });

    test('displays received assistant messages', async () => {
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Find the assistant-message callback
      const messageCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'assistant-message'
      )[1];
      
      // Simulate receiving a message
      act(() => {
        messageCallback({
          content: 'How can I help you today?',
          timestamp: new Date().toISOString(),
        });
      });
      
      expect(await screen.findByText('How can I help you today?')).toBeInTheDocument();
    });

    test('handles waiter request event', () => {
      const mockWaiterRequested = jest.fn();
      render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
          onWaiterRequested={mockWaiterRequested}
        />
      );
      
      // Find the waiter-requested callback
      const waiterCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'waiter-requested'
      )[1];
      
      // Simulate waiter request event
      act(() => {
        waiterCallback();
      });
      
      expect(mockWaiterRequested).toHaveBeenCalled();
    });

    test('displays chat history when received', async () => {
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Find the chat-history callback
      const historyCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'chat-history'
      )[1];
      
      // Simulate receiving chat history
      act(() => {
        historyCallback([
          {
            content: 'Previous message from user',
            role: 'user',
            createdAt: new Date().toISOString(),
          },
          {
            content: 'Previous response from assistant',
            role: 'assistant',
            createdAt: new Date().toISOString(),
          },
        ]);
      });
      
      expect(await screen.findByText('Previous message from user')).toBeInTheDocument();
      expect(screen.getByText('Previous response from assistant')).toBeInTheDocument();
    });
  });

  // Authentication tests
  describe('Authentication', () => {
    test('shows error when no authentication token is available', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<ChatWindow userId="user123" tableNumber={5} />);
      
      expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    test('displays error messages from server', async () => {
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Find the error callback
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      // Simulate error event
      act(() => {
        errorCallback({ message: 'Server error occurred' });
      });
      
      expect(await screen.findByText('Server error occurred')).toBeInTheDocument();
    });

    test('handles send message errors gracefully', async () => {
      const user = userEvent.setup();
      mockSocket.emit.mockImplementationOnce(() => {
        throw new Error('Failed to send message');
      });
      
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Simulate successful connection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      act(() => {
        connectCallback();
      });
      
      // Type and send a message
      const input = screen.getByPlaceholderText(/e\.g Tell me about your specials/i);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByLabelText('Send message');
      await user.click(sendButton);
      
      // Message should still appear in UI even if sending fails
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  // User interaction tests
  describe('User Interactions', () => {
    test('allows sending message with Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Simulate successful connection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      act(() => {
        connectCallback();
      });
      
      // Type and press Enter
      const input = screen.getByPlaceholderText(/e\.g Tell me about your specials/i);
      await user.type(input, 'Hello{Enter}');
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'client-message',
        expect.objectContaining({
          content: 'Hello',
        })
      );
    });

    test('clears input after sending message', async () => {
      const user = userEvent.setup();
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Simulate successful connection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      act(() => {
        connectCallback();
      });
      
      // Type and send a message
      const input = screen.getByPlaceholderText(/e\.g Tell me about your specials/i);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByLabelText('Send message');
      await user.click(sendButton);
      
      // Input should be cleared
      expect(input).toHaveValue('');
    });

    test('disables input and send button while sending', async () => {
      const user = userEvent.setup();
      render(<ChatWindow userId="user123" tableNumber={5} token="test-token" />);
      
      // Simulate successful connection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      act(() => {
        connectCallback();
      });
      
      // Type and send a message
      const input = screen.getByPlaceholderText(/e\.g Tell me about your specials/i);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByLabelText('Send message');
      await user.click(sendButton);
      
      // Input and button should be disabled while sending
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      
      // Simulate receiving a response
      const messageCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'assistant-message'
      )[1];
      
      act(() => {
        messageCallback({
          content: 'Response from assistant',
          timestamp: new Date().toISOString(),
        });
      });
      
      // After receiving response, input should be enabled again
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    test('closes chat when close button is clicked', async () => {
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
          onClose={mockOnClose}
          showCloseButton={true}
        />
      );
      
      const closeButton = screen.getByLabelText('Close chat');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // UI and rendering tests
  describe('UI and Rendering', () => {
    test('renders header with correct title', () => {
      render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
          headerText="Custom Header"
        />
      );
      
      expect(screen.getByText('Custom Header')).toBeInTheDocument();
    });

    test('renders custom placeholder text', () => {
      render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
          inputPlaceholder="Custom placeholder"
        />
      );
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    test('renders agent name correctly in messages', async () => {
      render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
          agentName="Custom Agent"
        />
      );
      
      // Simulate receiving a message
      const messageCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'assistant-message'
      )[1];
      
      act(() => {
        messageCallback({
          content: 'Hello from assistant',
          timestamp: new Date().toISOString(),
        });
      });
      
      // Should show the custom agent name
      expect(await screen.findByText('Custom Agent')).toBeInTheDocument();
    });

    test('applies custom className to container', () => {
      const { container } = render(
        <ChatWindow
          userId="user123"
          tableNumber={5}
          token="test-token"
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
