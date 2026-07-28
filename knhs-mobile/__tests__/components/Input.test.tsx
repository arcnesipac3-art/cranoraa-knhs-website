import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../src/components/ui/Input';

describe('Input Component', () => {
  it('should render correctly', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Test Input" onChangeText={() => {}} />
    );
    expect(getByPlaceholderText('Test Input')).toBeTruthy();
  });

  it('should call onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Test Input" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Test Input'), 'test value');
    expect(onChangeText).toHaveBeenCalledWith('test value');
  });

  it('should display label', () => {
    const { getByText } = render(
      <Input placeholder="Test Input" onChangeText={() => {}} label="Test Label" />
    );
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('should display error message', () => {
    const { getByText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        error="Test Error"
      />
    );
    expect(getByText('Test Error')).toBeTruthy();
  });

  it('should display helper text', () => {
    const { getByText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        helper="Test Helper"
      />
    );
    expect(getByText('Test Helper')).toBeTruthy();
  });

  it('should not display error and helper together', () => {
    const { queryByText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        error="Test Error"
        helper="Test Helper"
      />
    );
    expect(queryByText('Test Helper')).toBeNull();
  });

  it('should render with left icon', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        leftIcon={<></>}
      />
    );
    expect(getByPlaceholderText('Test Input')).toBeTruthy();
  });

  it('should render with right icon', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        rightIcon={<></>}
      />
    );
    expect(getByPlaceholderText('Test Input')).toBeTruthy();
  });

  it('should be secure entry', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        secureTextEntry
      />
    );
    expect(getByPlaceholderText('Test Input')).toBeTruthy();
  });

  it('should be disabled', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Test Input"
        onChangeText={() => {}}
        disabled
      />
    );
    expect(getByPlaceholderText('Test Input')).toBeTruthy();
  });
});