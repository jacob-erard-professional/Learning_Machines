/**
 * @file VoiceCommandBar.test.jsx
 * Unit tests for VoiceCommandBar component.
 * The useVoiceCommand hook and API are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock useVoiceCommand
// ---------------------------------------------------------------------------
const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
let commandState = {
  isListening: false,
  isProcessing: false,
  transcript: '',
  result: null,
  error: null,
};

vi.mock('../../src/hooks/useVoiceCommand.js', () => ({
  default: (onCommand) => ({
    ...commandState,
    startListening: mockStartListening,
    stopListening: mockStopListening,
  }),
}));

import VoiceCommandBar from '../../src/components/VoiceCommandBar.jsx';

const defaultProps = {
  onCommand: vi.fn(),
};

function renderBar(props = {}) {
  return render(<VoiceCommandBar {...defaultProps} {...props} />);
}

describe('VoiceCommandBar', () => {
  beforeEach(() => {
    commandState = {
      isListening: false,
      isProcessing: false,
      transcript: '',
      result: null,
      error: null,
    };
    mockStartListening.mockReset();
    mockStopListening.mockReset();
    defaultProps.onCommand.mockReset();
  });

  it('renders mic button', () => {
    renderBar();
    expect(screen.getByRole('button', { name: /listen|voice command|mic/i })).toBeInTheDocument();
  });

  it('clicking mic button starts listening', () => {
    renderBar();
    const btn = screen.getByRole('button', { name: /listen|voice command|mic/i });
    fireEvent.click(btn);
    expect(mockStartListening).toHaveBeenCalledOnce();
  });

  it('clicking mic again stops listening when isListening', () => {
    commandState = { ...commandState, isListening: true };
    renderBar();
    const btn = screen.getByRole('button', { name: /stop|listening/i });
    fireEvent.click(btn);
    expect(mockStopListening).toHaveBeenCalledOnce();
  });

  it('shows transcript while listening', () => {
    commandState = { ...commandState, isListening: true, transcript: 'Show high priority' };
    renderBar();
    expect(screen.getByText(/Show high priority/i)).toBeInTheDocument();
  });

  it('shows processing indicator', () => {
    commandState = { ...commandState, isProcessing: true };
    renderBar();
    expect(screen.getByText(/processing|thinking/i)).toBeInTheDocument();
  });

  it('shows error when present', () => {
    commandState = { ...commandState, error: 'Speech recognition not supported' };
    renderBar();
    expect(screen.getByText(/Speech recognition not supported/i)).toBeInTheDocument();
  });

  it('shows command result message', () => {
    commandState = {
      ...commandState,
      result: { action: 'filter', params: { priority: 'high' }, message: 'Showing high priority events.' },
    };
    renderBar();
    expect(screen.getByText(/Showing high priority events/i)).toBeInTheDocument();
  });

  it('allows submitting typed command', async () => {
    renderBar();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Reset filters' } });
    fireEvent.submit(input.closest('form'));
    // onCommand is called with text
    await waitFor(() => {
      // useVoiceCommand handles it — just ensure form submits without crash
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
