import { render, screen } from '@testing-library/react'
import LoginPage from '../src/app/page'

// Mock the next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    }
  },
}))

describe('Login Page', () => {
  it('renders a heading', () => {
    render(<LoginPage />)
    
    const heading = screen.getByText('Login', { selector: 'h2' })
    
    expect(heading).toBeInTheDocument()
  })

  it('renders login form inputs', () => {
    render(<LoginPage />)
    
    const idInput = screen.getByPlaceholderText('Email Address')
    const passInput = screen.getByPlaceholderText('Password')
    
    expect(idInput).toBeInTheDocument()
    expect(passInput).toBeInTheDocument()
  })
})
