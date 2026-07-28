import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../../src/components/ui/Card';

describe('Card Component', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Card>
        <Text>Test Content</Text>
      </Card>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render with default variant', () => {
    const { getByText } = render(
      <Card>
        <Text>Test Content</Text>
      </Card>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render with outlined variant', () => {
    const { getByText } = render(
      <Card variant="outlined">
        <Text>Test Content</Text>
      </Card>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render with elevated variant', () => {
    const { getByText } = render(
      <Card variant="elevated">
        <Text>Test Content</Text>
      </Card>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render with custom style', () => {
    const { getByText } = render(
      <Card style={{ backgroundColor: 'red' }}>
        <Text>Test Content</Text>
      </Card>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render with testID', () => {
    const { getByTestId } = render(
      <Card testID="test-card">
        <Text>Test Content</Text>
      </Card>
    );
    expect(getByTestId('test-card')).toBeTruthy();
  });
});