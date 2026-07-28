import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../../src/components/ui/Badge';

describe('Badge Component', () => {
  it('should render with label', () => {
    const { getByText } = render(<Badge label="Test Badge" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with primary variant', () => {
    const { getByText } = render(<Badge label="Test Badge" variant="primary" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with secondary variant', () => {
    const { getByText } = render(<Badge label="Test Badge" variant="secondary" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with success variant', () => {
    const { getByText } = render(<Badge label="Test Badge" variant="success" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with warning variant', () => {
    const { getByText } = render(<Badge label="Test Badge" variant="warning" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with error variant', () => {
    const { getByText } = render(<Badge label="Test Badge" variant="error" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with info variant', () => {
    const { getByText } = render(<Badge label="Test Badge" variant="info" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with sm size', () => {
    const { getByText } = render(<Badge label="Test Badge" size="sm" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with md size', () => {
    const { getByText } = render(<Badge label="Test Badge" size="md" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });

  it('should render with lg size', () => {
    const { getByText } = render(<Badge label="Test Badge" size="lg" />);
    expect(getByText('Test Badge')).toBeTruthy();
  });
});