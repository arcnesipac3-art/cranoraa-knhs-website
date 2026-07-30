/**
 * Login Page Tests
 *
 * Tests for the Login component: form rendering, submission, accessibility, loading state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signIn: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../utils/auth', () => ({
  loginRequest: vi.fn(),
}));

vi.mock('../utils/session', () => ({
  clearSession: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(),
  },
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders the login form', () => {
      renderLogin();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('renders username/identifier input', () => {
      renderLogin();
      const input = screen.getByRole('textbox', { name: /student id or email/i });
      expect(input).toBeInTheDocument();
    });

    it('renders password input', () => {
      renderLogin();
      const input = screen.getByLabelText('Password');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders sign in button', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders role tabs', () => {
      renderLogin();
      expect(screen.getByRole('tab', { name: /student/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /faculty/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /parent/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /admin/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on identifier input', () => {
      renderLogin();
      const input = screen.getByRole('textbox', { name: /student id or email/i });
      expect(input).toBeInTheDocument();
    });

    it('has aria-label on password input via label element', () => {
      renderLogin();
      const input = screen.getByLabelText('Password');
      expect(input).toBeInTheDocument();
    });

    it('has proper tablist with aria-label', () => {
      renderLogin();
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Select your role');
    });

    it('has aria-selected on active tab', () => {
      renderLogin();
      const studentTab = screen.getByRole('tab', { name: /student/i });
      expect(studentTab).toHaveAttribute('aria-selected', 'true');
    });

    it('has form with role=tabpanel', () => {
      renderLogin();
      const panel = screen.getByRole('tabpanel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('submits form via form submit event', async () => {
      const { loginRequest } = await import('../utils/auth');
      loginRequest.mockRejectedValue({ response: { status: 401, data: { error: 'Invalid' } } });

      renderLogin();
      fireEvent.change(screen.getByRole('textbox', { name: /student id or email/i }), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
      const form = screen.getByRole('tabpanel');
      fireEvent.submit(form);
      expect(loginRequest).toHaveBeenCalled();
    });

    it('submits form on button click', async () => {
      const { loginRequest } = await import('../utils/auth');
      loginRequest.mockRejectedValue({ response: { status: 401, data: { error: 'Invalid' } } });

      renderLogin();
      fireEvent.change(screen.getByRole('textbox', { name: /student id or email/i }), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(loginRequest).toHaveBeenCalled();
    });

    it('updates identifier value on input', () => {
      renderLogin();
      const input = screen.getByRole('textbox', { name: /student id or email/i });
      fireEvent.change(input, { target: { value: 'testuser' } });
      expect(input).toHaveValue('testuser');
    });

    it('updates password value on input', () => {
      renderLogin();
      const input = screen.getByLabelText('Password');
      fireEvent.change(input, { target: { value: 'secret123' } });
      expect(input).toHaveValue('secret123');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner during submission', async () => {
      const { loginRequest } = await import('../utils/auth');
      let resolveLogin;
      loginRequest.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));

      renderLogin();
      fireEvent.change(screen.getByRole('textbox', { name: /student id or email/i }), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });

      resolveLogin({ role: 'student' });
    });

    it('disables submit button while loading', async () => {
      const { loginRequest } = await import('../utils/auth');
      loginRequest.mockImplementation(() => new Promise(() => {}));

      renderLogin();
      fireEvent.change(screen.getByRole('textbox', { name: /student id or email/i }), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error dialog on failed login', async () => {
      const { loginRequest } = await import('../utils/auth');
      const Swal = (await import('sweetalert2')).default;
      loginRequest.mockRejectedValue({ response: { status: 401, data: { error: 'Invalid credentials' } } });

      renderLogin();
      fireEvent.change(screen.getByRole('textbox', { name: /student id or email/i }), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({ icon: 'error', title: 'Invalid Credentials' })
        );
      });
    });
  });
});
