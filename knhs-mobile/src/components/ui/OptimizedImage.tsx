import React from 'react';
import { Image, ImageProps, StyleSheet, View } from 'react-native';
import { useTheme } from '@theme';

interface OptimizedImageProps extends ImageProps {
  placeholderColor?: string;
  showPlaceholder?: boolean;
}

export function OptimizedImage({
  placeholderColor,
  showPlaceholder = true,
  style,
  ...props
}: OptimizedImageProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {showPlaceholder && (
        <View
          style={[
            styles.placeholder,
            { backgroundColor: placeholderColor || theme.colors.neutral[200] },
          ]}
        />
      )}
      <Image
        style={[styles.image, style]}
        resizeMode="cover"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});