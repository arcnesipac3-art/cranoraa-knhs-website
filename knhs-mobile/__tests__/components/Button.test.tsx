import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/ui/Button';

describe('Button Component', () => {
  it('should render correctly', () => {
    const { getByText } = render(<Button label="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Test Button" onPress={onPress} />);
    fireEvent.press(getByText('Test Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button label="Test Button" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Test Button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show loading indicator when loading', () => {
    const { queryByText } = render(
      <Button label="Test Button" onPress={() => {}} loading />
    );
    expect(queryByText('Test Button')).toBeNull();
  });

  it('should render with primary variant', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} variant="primary" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with secondary variant', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} variant="secondary" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with outline variant', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} variant="outline" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with danger variant', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} variant="danger" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with sm size', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} size="sm" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with md size', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} size="md" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with lg size', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} size="lg" />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with left icon', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} leftIcon={<></>} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should render with right icon', () => {
    const { getByText } = render(
      <Button label="Test Button" onPress={() => {}} rightIcon={<></>} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });
});