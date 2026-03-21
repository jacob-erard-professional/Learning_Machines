import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// JSDOM doesn't implement scrollIntoView — stub it globally
window.HTMLElement.prototype.scrollIntoView = () => {};

// Clean up after each test to prevent state leakage between tests
afterEach(() => cleanup())
