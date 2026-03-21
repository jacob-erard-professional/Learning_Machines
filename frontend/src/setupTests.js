import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Clean up after each test to prevent state leakage between tests
afterEach(() => cleanup())
