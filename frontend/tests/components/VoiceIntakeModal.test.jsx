/**
 * @file VoiceIntakeModal.test.jsx
 * Unit tests for VoiceIntakeModal component.
 * API calls and voice hook are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock API
// ---------------------------------------------------------------------------
vi.mock('../../src/lib/api.js', () => ({
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock useWhisperTranscription
// ---------------------------------------------------------------------------
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockClearTranscript = vi.fn();
let whisperState = {
  isModelLoading: false,
  modelProgress: 0,
  isRecording: false,
  transcript: '',
  isTranscriptFinal: false,
  error: null,
};

vi.mock('../../src/hooks/useWhisperTranscription.js', () => ({
  default: () => ({
    ...whisperState,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    clearTranscript: mockClearTranscript,
  }),
}));

import { apiPost, apiDelete } from '../../src/lib/api.js';
import VoiceIntakeModal from '../../src/components/VoiceIntakeModal.jsx';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onComplete: vi.fn(),
  initialFields: {},
};

function renderModal(props = {}) {
  return render(<VoiceIntakeModal {...defaultProps} {...props} />);
}

describe('VoiceIntakeModal', () => {
  beforeEach(() => {
    whisperState = {
      isModelLoading: false,
      modelProgress: 0,
      isRecording: false,
      transcript: '',
      isTranscriptFinal: false,
      error: null,
    };
    mockStartRecording.mockReset();
    mockStopRecording.mockReset();
    mockClearTranscript.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
    defaultProps.onClose.mockReset();
    defaultProps.onComplete.mockReset();

    // Default: start returns a session
    apiPost.mockImplementation(async (path) => {
      if (path === '/api/voice-intake/start') {
        return { sessionId: 'test-session-123', greeting: 'Hi! What is your name?' };
      }
      if (path === '/api/voice-intake/message') {
        return { reply: 'Got it!', extractedFields: {}, isComplete: false };
      }
      if (path === '/api/voice-intake/polish') {
        return { text: 'Cleaned up text.' };
      }
      return {};
    });
    apiDelete.mockResolvedValue(undefined);
  });

  it('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows greeting from API on mount', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Hi! What is your name?')).toBeInTheDocument();
    });
  });

  it('shows AI notice in modal header', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText(/AI/i)).toBeInTheDocument();
    });
  });

  it('calls apiPost /start on mount', async () => {
    renderModal();
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/voice-intake/start', expect.any(Object));
    });
  });

  it('sends user message on form submit', async () => {
    renderModal();
    await waitFor(() => screen.getByText('Hi! What is your name?'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'My name is Jane' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/voice-intake/message', expect.objectContaining({
        sessionId: 'test-session-123',
        message: 'My name is Jane',
      }));
    });
  });

  it('clears input after sending', async () => {
    renderModal();
    await waitFor(() => screen.getByText('Hi! What is your name?'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('shows review step when isComplete is true', async () => {
    apiPost.mockImplementation(async (path) => {
      if (path === '/api/voice-intake/start') {
        return { sessionId: 'test-session-123', greeting: 'Hi!' };
      }
      if (path === '/api/voice-intake/message') {
        return {
          reply: 'All done!',
          extractedFields: { requestorName: 'Jane Smith' },
          isComplete: true,
        };
      }
    });

    renderModal();
    await waitFor(() => screen.getByText('Hi!'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'done' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/review/i)).toBeInTheDocument();
    });
  });

  it('calls onComplete with extractedFields when user confirms review', async () => {
    apiPost.mockImplementation(async (path) => {
      if (path === '/api/voice-intake/start') {
        return { sessionId: 'test-session-123', greeting: 'Hi!' };
      }
      if (path === '/api/voice-intake/message') {
        return {
          reply: 'All done!',
          extractedFields: { requestorName: 'Jane Smith' },
          isComplete: true,
        };
      }
    });

    renderModal();
    await waitFor(() => screen.getByText('Hi!'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'done' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => screen.getByText(/review/i));

    const confirmBtn = screen.getByRole('button', { name: /fill form|use these|confirm/i });
    fireEvent.click(confirmBtn);

    expect(defaultProps.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ requestorName: 'Jane Smith' })
    );
  });

  it('calls onClose and DELETE session when modal is dismissed', async () => {
    renderModal();
    await waitFor(() => screen.getByText('Hi! What is your name?'));

    const closeBtn = screen.getByRole('button', { name: /close voice assistant/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/api/voice-intake/test-session-123');
    });
  });

  it('shows mic button for voice input', async () => {
    renderModal();
    await waitFor(() => screen.getByText('Hi! What is your name?'));
    expect(screen.getByRole('button', { name: /start voice recording/i })).toBeInTheDocument();
  });

  it('polishes a final transcript before putting it in the input', async () => {
    whisperState = {
      ...whisperState,
      transcript: 'hello my name is jane',
      isTranscriptFinal: true,
    };

    renderModal();

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/voice-intake/polish', {
        transcript: 'hello my name is jane',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('Cleaned up text.');
    });
  });
});
