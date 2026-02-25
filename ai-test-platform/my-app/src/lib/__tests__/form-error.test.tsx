/**
 * Form Error Tests - TDD Red Phase
 * 测试目标: 统一表单错误处理组件和 Hook
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormError, FormFieldError } from '@/components/FormError';
import { useFormError } from '@/lib/hooks/use-form-error';
import { ApiError } from '../api';

// Mock apiClient
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  apiClient: {
    post: jest.fn(),
  },
}));

describe('FormError Component', () => {
  it('should render field error with icon', () => {
    // Act
    render(<FormFieldError message="邮箱格式不正确" />);

    // Assert
    expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('should not render when message is empty', () => {
    // Act
    const { container } = render(<FormFieldError message="" />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('should render form-level error', () => {
    // Act
    render(<FormError message="提交失败，请检查表单" />);

    // Assert
    expect(screen.getByText('提交失败，请检查表单')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
  });

  it('should render multiple field errors', () => {
    // Arrange
    const errors = {
      email: '邮箱格式不正确',
      password: '密码至少需要8位',
    };

    // Act
    render(
      <div>
        <FormFieldError message={errors.email} />
        <FormFieldError message={errors.password} />
      </div>
    );

    // Assert
    expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
    expect(screen.getByText('密码至少需要8位')).toBeInTheDocument();
  });
});

describe('useFormError Hook', () => {
  const TestComponent = () => {
    const { fieldErrors, formError, setApiError, clearErrors } = useFormError();
    
    return (
      <div>
        <div data-testid="field-errors">{JSON.stringify(fieldErrors)}</div>
        <div data-testid="form-error">{formError || 'no-error'}</div>
        <button
          data-testid="set-error"
          onClick={() => {
            setApiError(new ApiError('VALIDATION_ERROR', '验证失败', 400, {
              email: ['邮箱已存在'],
              password: ['密码太简单'],
            }));
          }}
        >
          Set Error
        </button>
        <button data-testid="clear" onClick={clearErrors}>Clear</button>
      </div>
    );
  };

  it('should initialize with empty errors', () => {
    // Act
    render(<TestComponent />);

    // Assert
    expect(screen.getByTestId('field-errors')).toHaveTextContent('{}');
    expect(screen.getByTestId('form-error')).toHaveTextContent('no-error');
  });

  it('should map API validation error to field errors', async () => {
    // Arrange
    render(<TestComponent />);

    // Act
    await userEvent.click(screen.getByTestId('set-error'));

    // Assert
    expect(screen.getByTestId('field-errors')).toHaveTextContent(
      '"email":["邮箱已存在"]'
    );
    expect(screen.getByTestId('field-errors')).toHaveTextContent(
      '"password":["密码太简单"]'
    );
  });

  it('should clear errors', async () => {
    // Arrange
    render(<TestComponent />);
    await userEvent.click(screen.getByTestId('set-error'));

    // Act
    await userEvent.click(screen.getByTestId('clear'));

    // Assert
    expect(screen.getByTestId('field-errors')).toHaveTextContent('{}');
  });

  it('should handle generic API error as form error', async () => {
    // Arrange
    const TestComponentWithGenericError = () => {
      const { formError, setApiError } = useFormError();
      
      return (
        <div>
          <div data-testid="form-error">{formError || 'no-error'}</div>
          <button
            data-testid="set-generic-error"
            onClick={() => {
              setApiError(new ApiError('INTERNAL_ERROR', '服务器错误', 500));
            }}
          >
            Set Generic Error
          </button>
        </div>
      );
    };

    render(<TestComponentWithGenericError />);

    // Act
    await userEvent.click(screen.getByTestId('set-generic-error'));

    // Assert
    expect(screen.getByTestId('form-error')).toHaveTextContent('服务器错误');
  });
});

describe('Form Error Integration', () => {
  it('should display field error below input', async () => {
    // Arrange
    const LoginForm = () => {
      const [emailError, setEmailError] = React.useState('');
      
      return (
        <form>
          <input data-testid="email-input" />
          <FormFieldError message={emailError} />
          <button
            type="button"
            data-testid="validate-btn"
            onClick={() => setEmailError('邮箱格式不正确')}
          >
            Validate
          </button>
        </form>
      );
    };

    render(<LoginForm />);

    // Act
    await userEvent.click(screen.getByTestId('validate-btn'));

    // Assert
    expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
  });
});
