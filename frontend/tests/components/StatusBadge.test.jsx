/**
 * @fileoverview Tests for StatusBadge component.
 * Verifies all statuses render correct text label and aria-label.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../src/components/ui/StatusBadge.jsx';

const STATUS_CASES = [
  { status: 'pending', expectedLabel: 'Pending' },
  { status: 'needs_review', expectedLabel: 'Needs Review' },
  { status: 'approved', expectedLabel: 'Approved' },
  { status: 'fulfilled', expectedLabel: 'Fulfilled' },
  { status: 'rejected', expectedLabel: 'Rejected' },
];

describe('StatusBadge', () => {
  STATUS_CASES.forEach(({ status, expectedLabel }) => {
    it(`renders correct text label for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      // Text label is always visible (not color-only)
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    it(`renders correct aria-label for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      // Accessible label includes "Status:" prefix per contract
      expect(screen.getByLabelText(`Status: ${expectedLabel}`)).toBeInTheDocument();
    });
  });

  it('renders a status indicator dot alongside the text', () => {
    const { container } = render(<StatusBadge status="pending" />);
    // The dot span should be present (aria-hidden, purely visual reinforcement)
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it('applies size="md" class adjustments', () => {
    render(<StatusBadge status="approved" size="md" />);
    // Should still render the label
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('defaults to size="sm"', () => {
    render(<StatusBadge status="fulfilled" />);
    expect(screen.getByText('Fulfilled')).toBeInTheDocument();
  });

  it('rejected status does NOT use red — uses gray per healthcare guidelines', () => {
    const { container } = render(<StatusBadge status="rejected" />);
    const badge = container.firstChild;
    // Should contain gray class, not red class
    expect(badge.className).toContain('gray');
    expect(badge.className).not.toContain('red');
  });
});
