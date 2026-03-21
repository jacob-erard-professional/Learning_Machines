/**
 * @fileoverview Tests for RequestForm component.
 * Verifies required field validation on blur, past date rejection,
 * and API call on valid submit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RequestForm from '../../src/components/RequestForm.jsx';

// Mock the api module
vi.mock('../../src/lib/api.js', () => ({
  apiPost: vi.fn(),
}));

import { apiPost } from '../../src/lib/api.js';

function renderForm() {
  return render(
    <MemoryRouter>
      <RequestForm />
    </MemoryRouter>
  );
}

describe('RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Required field validation on blur', () => {
    it('shows error for Full Name when blurred empty', async () => {
      renderForm();
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.blur(nameInput);
      await waitFor(() => {
        expect(screen.getByText('Full name is required.')).toBeInTheDocument();
      });
    });

    it('shows error for Email when blurred empty', async () => {
      renderForm();
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format on blur', async () => {
      renderForm();
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByText('Must be a valid email address (e.g. jane@example.org).')).toBeInTheDocument();
      });
    });

    it('shows error for Phone when blurred empty', async () => {
      renderForm();
      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.blur(phoneInput);
      await waitFor(() => {
        expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
      });
    });

    it('shows error for Event Name when blurred empty', async () => {
      renderForm();
      const eventNameInput = screen.getByLabelText(/event name/i);
      fireEvent.blur(eventNameInput);
      await waitFor(() => {
        expect(screen.getByText('Event name is required.')).toBeInTheDocument();
      });
    });

    it('shows error for City when blurred empty', async () => {
      renderForm();
      const cityInput = screen.getByLabelText(/city/i);
      fireEvent.blur(cityInput);
      await waitFor(() => {
        expect(screen.getByText('City is required.')).toBeInTheDocument();
      });
    });

    it('shows error for ZIP when blurred empty', async () => {
      renderForm();
      const zipInput = screen.getByLabelText(/zip code/i);
      fireEvent.blur(zipInput);
      await waitFor(() => {
        expect(screen.getByText('ZIP code is required.')).toBeInTheDocument();
      });
    });

    it('shows error for ZIP with non-5-digit value', async () => {
      renderForm();
      const zipInput = screen.getByLabelText(/zip code/i);
      fireEvent.change(zipInput, { target: { value: '841' } });
      fireEvent.blur(zipInput);
      await waitFor(() => {
        expect(screen.getByText('Must be a 5-digit ZIP (84101) or ZIP+4 (84101-1234).')).toBeInTheDocument();
      });
    });

    it('clears error when valid value is entered after blur', async () => {
      renderForm();
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.blur(nameInput);
      await waitFor(() => {
        expect(screen.getByText('Full name is required.')).toBeInTheDocument();
      });
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
      await waitFor(() => {
        expect(screen.queryByText('Full name is required.')).not.toBeInTheDocument();
      });
    });

    it('error messages have role="alert"', async () => {
      renderForm();
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.blur(nameInput);
      await waitFor(() => {
        // role="alert" elements don't require an accessible name —
        // verify the alert exists and contains the error message text
        const alerts = screen.getAllByRole('alert');
        const nameAlert = alerts.find((el) => el.textContent.includes('Full name is required.'));
        expect(nameAlert).toBeTruthy();
        expect(nameAlert).toBeInTheDocument();
      });
    });
  });

  describe('Event date validation', () => {
    it('shows error for past date on blur', async () => {
      renderForm();
      const dateInput = screen.getByLabelText(/event date/i);
      fireEvent.change(dateInput, { target: { value: '2020-01-01' } });
      fireEvent.blur(dateInput);
      await waitFor(() => {
        expect(screen.getByText('Event date must be today or in the future.')).toBeInTheDocument();
      });
    });

    it('accepts a future date without error', async () => {
      renderForm();
      const dateInput = screen.getByLabelText(/event date/i);
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      fireEvent.change(dateInput, { target: { value: futureDateStr } });
      fireEvent.blur(dateInput);
      await waitFor(() => {
        expect(screen.queryByText('Event date must be today or in the future.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('does not call apiPost when required fields are empty', async () => {
      renderForm();
      const submitButton = screen.getByRole('button', { name: /submit community health request/i });
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(apiPost).not.toHaveBeenCalled();
      });
    });

    it('shows multiple errors when submitting with empty required fields', async () => {
      renderForm();
      const submitButton = screen.getByRole('button', { name: /submit community health request/i });
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Full name is required.')).toBeInTheDocument();
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      });
    });

    it('submit button shows loading state while API call is in-flight', async () => {
      // Mock a delayed response
      apiPost.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'REQ-0001', status: 'pending', aiTags: [] }), 100))
      );

      renderForm();

      // Fill all required fields
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Smith' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@test.com' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '801-555-0100' } });
      fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'Health Fair' } });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      fireEvent.change(screen.getByLabelText(/event date/i), {
        target: { value: futureDate.toISOString().split('T')[0] },
      });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Salt Lake City' } });
      fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '84101' } });

      // Select a request type
      const staffButton = screen.getByRole('radio', { name: /staff support/i });
      fireEvent.click(staffButton);

      const submitButton = screen.getByRole('button', { name: /submit community health request/i });
      fireEvent.click(submitButton);

      // Button should be aria-busy during loading
      await waitFor(() => {
        expect(submitButton).toHaveAttribute('aria-busy', 'true');
      });
    });

    it('calls apiPost with correct payload on valid submit', async () => {
      const mockResult = {
        id: 'REQ-0001',
        status: 'pending',
        fulfillmentRoute: 'staff_deployment',
        routingReason: 'In service area.',
        aiStatus: 'success',
        aiTags: ['health fair'],
        aiSummary: 'A health fair.',
        aiConfidence: 'high',
        createdAt: '2026-03-21T14:30:00Z',
      };
      apiPost.mockResolvedValueOnce(mockResult);

      renderForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Smith' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@test.com' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '801-555-0100' } });
      fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'Senior Health Fair' } });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      fireEvent.change(screen.getByLabelText(/event date/i), { target: { value: futureDateStr } });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Salt Lake City' } });
      fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '84101' } });

      fireEvent.click(screen.getByRole('radio', { name: /staff support/i }));

      fireEvent.click(screen.getByRole('button', { name: /submit community health request/i }));

      await waitFor(() => {
        expect(apiPost).toHaveBeenCalledWith('/api/requests', expect.objectContaining({
          requestorName: 'Jane Smith',
          requestorEmail: 'jane@test.com',
          requestorPhone: '(801) 555-0100',
          eventName: 'Senior Health Fair',
          eventDate: futureDateStr,
          eventCity: 'Salt Lake City',
          eventZip: '84101',
          requestType: 'staff_support',
        }));
      });
    });

    it('infers city and zip from a full address', async () => {
      renderForm();

      const addressInput = screen.getByLabelText(/event address/i);
      fireEvent.change(addressInput, {
        target: { value: '123 Main St, Salt Lake City, UT 84101' },
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/city/i)).toHaveValue('Salt Lake City');
        expect(screen.getByLabelText(/zip code/i)).toHaveValue('84101');
      });
    });

    it('shows ConfirmationCard on successful submit', async () => {
      const mockResult = {
        id: 'REQ-0001',
        status: 'pending',
        fulfillmentRoute: 'staff_deployment',
        routingReason: 'In service area.',
        aiStatus: 'success',
        aiTags: ['health fair', 'seniors'],
        aiSummary: 'A senior health fair.',
        aiConfidence: 'high',
        createdAt: '2026-03-21T14:30:00Z',
      };
      apiPost.mockResolvedValueOnce(mockResult);

      renderForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Smith' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@test.com' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '801-555-0100' } });
      fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'Health Fair' } });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      fireEvent.change(screen.getByLabelText(/event date/i), {
        target: { value: futureDate.toISOString().split('T')[0] },
      });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Salt Lake City' } });
      fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '84101' } });
      fireEvent.click(screen.getByRole('radio', { name: /staff support/i }));

      fireEvent.click(screen.getByRole('button', { name: /submit community health request/i }));

      await waitFor(() => {
        expect(screen.getByText('REQ-0001')).toBeInTheDocument();
        expect(screen.getByText('Request Submitted!')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('required fields have aria-required="true"', () => {
      renderForm();
      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    it('invalid fields get aria-invalid="true" after blur', async () => {
      renderForm();
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.blur(nameInput);
      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
